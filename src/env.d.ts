/// <reference types="vite/client" />

interface FFmpegProgress {
  taskId: string;
  frame: number;
  fps: number;
  time: string;
  percent: number;
  speed: string;
}

interface FileInfo {
  path: string;
  name: string;
  format: string;
  duration: string;
  resolution: string;
  fileSize: string;
  videoCodec: string;
  audioCodec: string;
  fps: number;
  bitrate: string;
}

interface FFmpegStatus {
  ffmpeg: boolean;
  ffprobe: boolean;
  ffmpegPath?: string;
  ffprobePath?: string;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
}

interface ElectronAPI {
  ffmpeg: {
    run: (params: FFmpegRunParams) => Promise<string>;
    cancel: (taskId: string) => void;
    getProgress: (taskId: string, callback: (progress: FFmpegProgress) => void) => () => void;
    onDone: (taskId: string, callback: (taskId: string, outputPath: string) => void) => () => void;
    onError: (taskId: string, callback: (taskId: string, error: string) => void) => () => void;
  };
  file: {
    getInfo: (filePath: string) => Promise<FileInfo>;
    openDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string[]>;
    openDirDialog: () => Promise<string | null>;
    saveDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
  app: {
    getFfmpegStatus: () => Promise<FFmpegStatus>;
    recheckFfmpeg: () => Promise<FFmpegStatus>;
    selectFfmpegPath: () => Promise<string | null>;
    selectFfprobePath: () => Promise<string | null>;
    getLog: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    onFfmpegStatus: (callback: (status: FFmpegStatus) => void) => () => void;
  };
}

interface FFmpegRunParams {
  taskId: string;
  inputPath: string;
  inputPaths?: string[];
  outputPath: string;
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  fps?: number;
  bitrate?: string;
  crf?: number;
  preset?: string;
  extraArgs?: string[];
}

interface Window {
  electronAPI: ElectronAPI;
}
