import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { logger } from './logger';
import { ffmpegConfig } from './ffmpeg-config';
import { registerFFmpegHandlers } from './ipc/ffmpeg';

// ── Single instance lock ──
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to launch a second instance — focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow: BrowserWindow | null = null;
let ffmpegAvailable = false;
let ffprobeAvailable = false;
let ffmpegVersion = '';
let ffprobeVersion = '';

const isDev = !app.isPackaged;

// ── Custom protocol for local file access (video preview) ──
// Must be called BEFORE app.ready via registerSchemesAsPrivileged
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function registerProtocol() {
  protocol.handle('local-file', (request) => {
    // URL format: local-file://D%3A%2FNVIDIA%20REPLAY%2Fvideo.mp4
    let raw = request.url.replace('local-file://', '');
    // Remove any leading slashes the browser may have injected
    raw = raw.replace(/^\/+/, '');
    const filePath = decodeURIComponent(raw);
    // Use pathToFileURL to correctly handle Windows drive letters
    const fileUrl = pathToFileURL(filePath).href;
    logger.info(`[local-file] serving: ${fileUrl}`);
    return net.fetch(fileUrl);
  });
}

// ── Locate a tool: first check custom path, then try system PATH ──
function locateTool(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const locatorCmd = isWin ? 'where' : 'which';
    const proc = spawn(locatorCmd, [name], { shell: true });
    let stdout = '';
    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const found = stdout.trim().split('\n')[0].trim();
        logger.info(`locate ${name}: ${found}`);
        resolve(found);
      } else {
        // where/which failed — try finding in common install dirs
        const commonDirs = isWin
          ? [
              `C:\\ffmpeg\\bin\\${name}.exe`,
              `${process.env.ProgramFiles}\\ffmpeg\\bin\\${name}.exe`,
              `${process.env.LOCALAPPDATA}\\ffmpeg\\bin\\${name}.exe`,
            ]
          : [
              `/usr/local/bin/${name}`,
              `/usr/bin/${name}`,
              `/opt/homebrew/bin/${name}`,
            ];
        const fs = require('fs');
        for (const p of commonDirs) {
          if (fs.existsSync(p)) {
            logger.info(`locate ${name} (common dir): ${p}`);
            resolve(p);
            return;
          }
        }
        resolve(null);
      }
    });
    proc.on('error', () => resolve(null));
  });
}

// ── Check if a tool works by running -version ──
function checkTool(name: string, binaryPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Set cwd to the binary's directory so shared-build DLLs can be found
    const cwd = path.dirname(binaryPath);
    logger.info(`检测 ${name}: ${binaryPath} (cwd: ${cwd})`);

    // Use shell:true so Windows can resolve the path + PATH for DLLs
    const proc = spawn(binaryPath, ['-version'], {
      shell: true,
      cwd,
    });

    let stdout = '';
    let stderr = '';
    const resolved = { value: false };

    const finish = (ok: boolean) => {
      if (resolved.value) return; // already resolved via timeout
      resolved.value = true;
      proc.kill();
      resolve(ok);
    };

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const ok = code === 0 && stdout.length > 0;
      if (ok) {
        const firstLine = stdout.split('\n')[0] || '';
        logger.info(`${name} 检测成功: ${firstLine}`);
        if (name === 'ffmpeg') ffmpegVersion = firstLine;
        if (name === 'ffprobe') ffprobeVersion = firstLine;
      } else {
        logger.warn(`${name} 测试失败 (exit ${code}, stderr: ${stderr.slice(0, 200)})`);
      }
      finish(ok);
    });

    proc.on('error', (err) => {
      logger.warn(`${name} 启动失败: ${err.message}`);
      finish(false);
    });

    // Safety timeout: if process hangs (DLL issues), resolve as failure
    setTimeout(() => {
      if (!resolved.value) {
        logger.warn(`${name} 检测超时 (8s) — 进程可能因缺少 DLL 挂起`);
        finish(false);
      }
    }, 8000);
  });
}

async function checkFFmpegTools() {
  logger.info('开始检测 FFmpeg 工具链...');

  // FFmpeg
  const ffmpegBin = ffmpegConfig.getFfmpeg();
  if (ffmpegConfig.hasCustomFfmpeg()) {
    ffmpegAvailable = await checkTool('ffmpeg', ffmpegBin);
  } else {
    const located = await locateTool('ffmpeg');
    if (located) {
      ffmpegAvailable = await checkTool('ffmpeg', located);
    } else {
      ffmpegAvailable = await checkTool('ffmpeg', 'ffmpeg');
    }
  }

  // FFprobe
  const ffprobeBin = ffmpegConfig.getFfprobe();
  if (ffmpegConfig.hasCustomFfprobe()) {
    ffprobeAvailable = await checkTool('ffprobe', ffprobeBin);
  } else {
    const located = await locateTool('ffprobe');
    if (located) {
      ffprobeAvailable = await checkTool('ffprobe', located);
    } else {
      ffprobeAvailable = await checkTool('ffprobe', 'ffprobe');
    }
  }

  if (!ffmpegAvailable) {
    logger.error('FFmpeg 未安装或不在 PATH 中 — 转码功能不可用');
  }
  if (!ffprobeAvailable) {
    logger.error('FFprobe 未安装或不在 PATH 中 — 媒体信息获取不可用');
  }

  mainWindow?.webContents.send('app:ffmpegStatus', {
    ffmpeg: ffmpegAvailable,
    ffprobe: ffprobeAvailable,
    ffmpegPath: ffmpegConfig.getFfmpeg(),
    ffprobePath: ffmpegConfig.getFfprobe(),
    ffmpegVersion,
    ffprobeVersion,
  });
}

// ── Create window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1440,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  logger.info(`FFmpegEasyConfig 启动 (${isDev ? '开发模式' : '生产模式'})`);
  logger.info(`日志文件: ${logger.getPath()}`);

  registerProtocol();
  createWindow();
  registerFFmpegHandlers();
  registerWindowHandlers();
  registerFileHandlers();
  registerAppHandlers();

  setTimeout(checkFFmpegTools, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  logger.info('所有窗口已关闭，应用退出');
  if (process.platform !== 'darwin') app.quit();
});

// ── Window control handlers ──
function registerWindowHandlers() {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
}

// ── File dialog handlers ──
function registerFileHandlers() {
  ipcMain.handle('file:openDialog', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: options?.filters || [{
        name: '媒体文件',
        extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
      }],
    });
    logger.info(`打开文件对话框: 选择了 ${result.filePaths.length} 个文件`);
    return result.filePaths;
  });

  ipcMain.handle('file:openDirDialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择输出目录',
      properties: ['openDirectory'],
    });
    logger.info(`选择输出目录: ${result.canceled ? '取消' : result.filePaths[0]}`);
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('file:saveDialog', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'MP4', extensions: ['mp4'] },
        { name: 'AVI', extensions: ['avi'] },
        { name: 'MKV', extensions: ['mkv'] },
        { name: 'MOV', extensions: ['mov'] },
        { name: 'WebM', extensions: ['webm'] },
        { name: 'GIF', extensions: ['gif'] },
        { name: 'MP3', extensions: ['mp3'] },
        { name: '全部文件', extensions: ['*'] },
      ],
    });
    logger.info(`保存文件对话框: ${result.filePath || '取消'}`);
    return result.filePath;
  });
}

// ── App-level handlers ──
function registerAppHandlers() {
  ipcMain.handle('app:ffmpegStatus', () => ({
    ffmpeg: ffmpegAvailable,
    ffprobe: ffprobeAvailable,
    ffmpegPath: ffmpegConfig.getFfmpeg(),
    ffprobePath: ffmpegConfig.getFfprobe(),
    ffmpegVersion,
    ffprobeVersion,
  }));

  ipcMain.handle('app:recheckFfmpeg', async () => {
    await checkFFmpegTools();
    return { ffmpeg: ffmpegAvailable, ffprobe: ffprobeAvailable };
  });

  // Manual ffmpeg path selection
  ipcMain.handle('app:selectFfmpegPath', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择 ffmpeg.exe',
      properties: ['openFile'],
      filters: [
        { name: 'FFmpeg 可执行文件', extensions: ['exe', ''] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      ffmpegConfig.setFfmpeg(result.filePaths[0]);
      logger.info(`用户手动选择 ffmpeg: ${result.filePaths[0]}`);
      await checkFFmpegTools();
    }
    return result.canceled ? null : result.filePaths[0];
  });

  // Manual ffprobe path selection
  ipcMain.handle('app:selectFfprobePath', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择 ffprobe.exe',
      properties: ['openFile'],
      filters: [
        { name: 'FFprobe 可执行文件', extensions: ['exe', ''] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      ffmpegConfig.setFfprobe(result.filePaths[0]);
      logger.info(`用户手动选择 ffprobe: ${result.filePaths[0]}`);
      await checkFFmpegTools();
    }
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('app:getLog', () => logger.readAll());
  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    logger.info(`打开外部链接: ${url}`);
    await shell.openExternal(url);
  });
}
