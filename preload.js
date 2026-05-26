/**
 * preload.js — 预加载脚本
 *
 * 通过 contextBridge 向渲染进程安全地暴露有限的 IPC API。
 * 渲染进程只能调用这里显式列出的方法，无法访问 Node.js 或 Electron 内部 API。
 *
 * 暴露的 API 挂载在 window.electronAPI 上：
 *  - selectInputFile()      打开文件选择对话框，返回路径或 null
 *  - selectOutputFile(...)   打开保存对话框，返回路径或 null
 *  - runFFmpeg(args)        执行 ffmpeg/ffprobe，返回 {exitCode, stdout, stderr, success}
 *  - cancelFFmpeg()         终止当前正在运行的 ffmpeg 进程
 *  - getVersion()           获取 ffmpeg 版本字符串
 *  - onStderr(callback)     监听 ffmpeg stderr 实时输出（进度）
 *  - removeStderrListener() 移除 stderr 监听
 *  - openInExplorer(path)   在系统文件管理器中打开路径
 *  - openExternal(url)      用默认浏览器打开链接
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ---- 文件选择 ----
  selectInputFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  selectOutputFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // ---- 初始化检测 ----
  checkSetup: () => ipcRenderer.invoke('app:checkSetup'),

  // ---- FFmpeg 执行 ----
  runFFmpeg: (args) => ipcRenderer.invoke('ffmpeg:run', args),
  cancelFFmpeg: () => ipcRenderer.invoke('ffmpeg:cancel'),
  getVersion: () => ipcRenderer.invoke('ffmpeg:version'),

  // ---- 实时日志监听 ----
  onStderr: (callback) => {
    // 注册一个只监听 'ffmpeg:stderr' 频道的回调
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('ffmpeg:stderr', handler);
    // 返回取消订阅函数
    return () => ipcRenderer.removeListener('ffmpeg:stderr', handler);
  },

  // ---- 窗口控制 ----
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // ---- 系统集成 ----
  openInExplorer: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});
