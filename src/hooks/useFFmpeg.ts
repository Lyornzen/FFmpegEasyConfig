import { useState, useRef, useCallback } from 'react';
import { message } from 'antd';
// FFmpegProgress is declared globally in env.d.ts

interface UseFFmpegOptions {
  onProgress?: (progress: FFmpegProgress) => void;
  onComplete?: (taskId: string, outputPath: string) => void;
  onError?: (taskId: string, error: string) => void;
}

export function useFFmpeg(options: UseFFmpegOptions = {}) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<FFmpegProgress | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);

  const run = useCallback(
    async (params: {
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
    }) => {
      if (!window.electronAPI) {
        message.warning('FFmpeg 功能仅在 Electron 环境中可用');
        return;
      }

      setIsRunning(true);
      setProgress(null);

      // Clean up previous listeners
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];

      // Listen for progress
      const unsubProgress = window.electronAPI.ffmpeg.getProgress(
        params.taskId,
        (p: FFmpegProgress) => {
          setProgress(p);
          options.onProgress?.(p);
        }
      );
      cleanupRef.current.push(unsubProgress);

      // Listen for completion
      const unsubDone = window.electronAPI.ffmpeg.onDone(params.taskId, (taskId, outputPath) => {
        setIsRunning(false);
        message.success('转换完成！');
        options.onComplete?.(taskId, outputPath);
      });
      cleanupRef.current.push(unsubDone);

      // Listen for errors
      const unsubError = window.electronAPI.ffmpeg.onError(params.taskId, (taskId, error) => {
        setIsRunning(false);
        message.error(`转换失败: ${error.slice(0, 200)}`);
        options.onError?.(taskId, error);
      });
      cleanupRef.current.push(unsubError);

      try {
        await window.electronAPI.ffmpeg.run(params);
      } catch (err: any) {
        setIsRunning(false);
        message.error(`FFmpeg 运行错误: ${err.message}`);
        options.onError?.(params.taskId, err.message);
      }
    },
    [options]
  );

  const cancel = useCallback(
    (taskId: string) => {
      window.electronAPI?.ffmpeg.cancel(taskId);
      setIsRunning(false);
    },
    []
  );

  return { run, cancel, isRunning, progress };
}
