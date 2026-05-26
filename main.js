/**
 * main.js — Electron 主进程
 *
 * 职责：
 *  - 创建 BrowserWindow，加载渲染进程
 *  - 通过 IPC 接收渲染进程的命令请求，安全地调用系统 ffmpeg/ffprobe
 *  - 管理子进程生命周期（spawn / kill）
 *  - 处理文件选择对话框
 *
 * 安全原则：
 *  - nodeIntegration: false —— 渲染进程无法直接访问 Node API
 *  - contextIsolation: true —— 渲染进程与主进程隔离
 *  - 使用 preload.js 通过 contextBridge 暴露受控 API
 *  - 所有 ffmpeg 调用由主进程执行，渲染进程只发送参数
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// --------------- FFmpeg / FFprobe 二进制路径 ---------------
// @ffmpeg-installer 为当前平台提供正确的二进制路径
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

// --------------- 全局状态 ---------------
let mainWindow = null;
let currentProcess = null; // 当前正在运行的 ffmpeg/ffprobe 子进程

// --------------- 创建窗口 ---------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'FFmpeg GUI',
    frame: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 开发时可打开 DevTools
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    killCurrentProcess();
  });
}

// --------------- 杀死当前子进程 ---------------
function killCurrentProcess() {
  if (currentProcess && !currentProcess.killed) {
    currentProcess.kill('SIGTERM');
    // 宽限期后强杀
    setTimeout(() => {
      if (currentProcess && !currentProcess.killed) {
        currentProcess.kill('SIGKILL');
      }
    }, 3000);
    currentProcess = null;
  }
}

// ================================================================
//  IPC 处理 —— 主进程与渲染进程之间的通信桥梁
// ================================================================

// ---- 文件选择对话框 ----
ipcMain.handle('dialog:openFile', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || '选择媒体文件',
    filters: options?.filters || [
      { name: '媒体文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts'] },
      { name: '音频文件', extensions: ['mp3', 'aac', 'wav', 'flac', 'ogg', 'opus', 'm4a', 'wma'] },
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ---- 文件保存对话框 ----
ipcMain.handle('dialog:saveFile', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || '保存输出文件',
    defaultPath: options?.defaultPath || 'output.mp4',
    filters: options?.filters || [
      { name: 'MP4 视频', extensions: ['mp4'] },
      { name: 'MKV 视频', extensions: ['mkv'] },
      { name: 'AVI 视频', extensions: ['avi'] },
      { name: 'MOV 视频', extensions: ['mov'] },
      { name: 'WEBM 视频', extensions: ['webm'] },
      { name: 'GIF 动图', extensions: ['gif'] },
      { name: 'MP3 音频', extensions: ['mp3'] },
      { name: 'AAC 音频', extensions: ['aac'] },
      { name: 'FLAC 音频', extensions: ['flac'] },
      { name: 'WAV 音频', extensions: ['wav'] },
      { name: 'Opus 音频', extensions: ['opus'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePath;
});

// ---- 运行 FFmpeg / FFprobe ----
ipcMain.handle('ffmpeg:run', async (_event, args) => {
  // 如果有正在运行的进程，先终止
  killCurrentProcess();

  return new Promise((resolve) => {
    const isProbe = args[0] === 'ffprobe';
    const binaryPath = isProbe ? ffprobePath : ffmpegPath;
    const binaryArgs = isProbe ? args.slice(1) : args;

    console.log(`[main] spawn: ${binaryPath} ${binaryArgs.join(' ')}`);

    currentProcess = spawn(binaryPath, binaryArgs);

    // 30 分钟超时保护 —— 防止 ffmpeg 挂死
    const timeoutMs = 30 * 60 * 1000;
    const timer = setTimeout(() => {
      if (currentProcess && !currentProcess.killed) {
        currentProcess.kill('SIGTERM');
        setTimeout(() => {
          if (currentProcess && !currentProcess.killed) {
            currentProcess.kill('SIGKILL');
          }
        }, 3000);
      }
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    // ffmpeg 的进度信息输出到 stderr（这是 ffmpeg 的惯例）
    currentProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    currentProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      // 实时推送 stderr 给渲染进程（用于进度展示）
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ffmpeg:stderr', data.toString());
      }
    });

    currentProcess.on('close', (code) => {
      clearTimeout(timer);
      currentProcess = null;
      resolve({
        exitCode: code,
        stdout,
        stderr,
        success: code === 0,
      });
    });

    currentProcess.on('error', (err) => {
      clearTimeout(timer);
      currentProcess = null;
      resolve({
        exitCode: -1,
        stdout: '',
        stderr: err.message,
        success: false,
      });
    });
  });
});

// ---- 首次启动检测 ffmpeg ----
ipcMain.handle('app:checkSetup', async () => {
  const checkBinary = (binPath, label) => {
    const exists = fs.existsSync(binPath);
    if (!exists) return { found: false, version: null, path: binPath, label };
    return new Promise((resolve) => {
      const proc = spawn(binPath, ['-version']);
      let out = '';
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.on('close', (code) => {
        const firstLine = out.split('\n')[0] || '';
        resolve({ found: code === 0, version: firstLine, path: binPath, label });
      });
      proc.on('error', () => {
        resolve({ found: false, version: null, path: binPath, label });
      });
    });
  };

  const ffmpeg = await checkBinary(ffmpegPath, 'FFmpeg');
  const ffprobe = await checkBinary(ffprobePath, 'FFprobe');

  return {
    ffmpeg,
    ffprobe,
    allReady: ffmpeg.found && ffprobe.found,
  };
});

// ---- 窗口控制 ----
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// ---- 取消当前任务 ----
ipcMain.handle('ffmpeg:cancel', async () => {
  killCurrentProcess();
  return true;
});

// ---- 获取 FFmpeg 版本 ----
ipcMain.handle('ffmpeg:version', async () => {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-version']);
    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.on('close', () => {
      // 取第一行：ffmpeg version X.Y.Z ...
      const firstLine = output.split('\n')[0] || '未知版本';
      resolve(firstLine);
    });
  });
});

// ---- 用系统默认程序打开文件 ----
ipcMain.handle('shell:openPath', async (_event, filePath) => {
  shell.openPath(filePath);
});

// ---- 打开外部链接 ----
ipcMain.handle('shell:openExternal', async (_event, url) => {
  await shell.openExternal(url);
});

// ================================================================
//  应用生命周期
// ================================================================

app.whenReady().then(() => {
  createWindow();

  // macOS: 点击 dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 退出前清理
app.on('before-quit', () => {
  killCurrentProcess();
});
