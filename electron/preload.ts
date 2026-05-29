import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ffmpeg: {
    run: (params: any) => ipcRenderer.invoke('ffmpeg:run', params),
    cancel: (taskId: string) => ipcRenderer.send('ffmpeg:cancel', taskId),
    getProgress: (taskId: string, callback: (progress: any) => void) => {
      const handler = (_event: any, data: any) => {
        if (data.taskId === taskId) callback(data);
      };
      ipcRenderer.on('ffmpeg:progress', handler);
      return () => ipcRenderer.removeListener('ffmpeg:progress', handler);
    },
    onDone: (taskId: string, callback: (taskId: string, outputPath: string) => void) => {
      const handler = (_event: any, data: any) => {
        if (data.taskId === taskId) callback(data.taskId, data.outputPath);
      };
      ipcRenderer.on('ffmpeg:done', handler);
      return () => ipcRenderer.removeListener('ffmpeg:done', handler);
    },
    onError: (taskId: string, callback: (taskId: string, error: string) => void) => {
      const handler = (_event: any, data: any) => {
        if (data.taskId === taskId) callback(data.taskId, data.error);
      };
      ipcRenderer.on('ffmpeg:error', handler);
      return () => ipcRenderer.removeListener('ffmpeg:error', handler);
    },
  },
  file: {
    getInfo: (filePath: string) => ipcRenderer.invoke('file:getInfo', filePath),
    openDialog: (options?: any) => ipcRenderer.invoke('file:openDialog', options),
    openDirDialog: () => ipcRenderer.invoke('file:openDirDialog'),
    saveDialog: (options?: any) => ipcRenderer.invoke('file:saveDialog', options),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  app: {
    getFfmpegStatus: () => ipcRenderer.invoke('app:ffmpegStatus'),
    recheckFfmpeg: () => ipcRenderer.invoke('app:recheckFfmpeg'),
    selectFfmpegPath: () => ipcRenderer.invoke('app:selectFfmpegPath'),
    selectFfprobePath: () => ipcRenderer.invoke('app:selectFfprobePath'),
    getLog: () => ipcRenderer.invoke('app:getLog'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    onFfmpegStatus: (callback: (status: any) => void) => {
      const handler = (_event: any, status: any) => callback(status);
      ipcRenderer.on('app:ffmpegStatus', handler);
      return () => ipcRenderer.removeListener('app:ffmpegStatus', handler);
    },
  },
});
