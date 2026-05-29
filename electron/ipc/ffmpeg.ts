import { ipcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../logger';
import { ffmpegConfig } from '../ffmpeg-config';

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

const activeTasks = new Map<string, ChildProcess>();

function buildFFmpegArgs(params: FFmpegRunParams): string[] {
  const args: string[] = ['-y'];

  // Support multiple input files (for concat filter, etc.)
  if (params.inputPaths && params.inputPaths.length > 0) {
    for (const p of params.inputPaths) {
      args.push('-i', p);
    }
  } else {
    args.push('-i', params.inputPath);
  }

  if (params.videoCodec && params.videoCodec !== 'copy') {
    args.push('-c:v', params.videoCodec);
  } else if (params.videoCodec === 'copy') {
    args.push('-c:v', 'copy');
  }

  if (params.audioCodec && params.audioCodec !== 'copy') {
    args.push('-c:a', params.audioCodec);
  } else if (params.audioCodec === 'copy') {
    args.push('-c:a', 'copy');
  }

  if (params.resolution) {
    args.push('-vf', `scale=${params.resolution}`);
  }

  if (params.fps) {
    args.push('-r', String(params.fps));
  }

  if (params.bitrate) {
    args.push('-b:v', params.bitrate);
  }

  if (params.crf !== undefined && params.crf >= 0) {
    args.push('-crf', String(params.crf));
  }

  if (params.preset) {
    args.push('-preset', params.preset);
  }

  if (params.extraArgs && params.extraArgs.length > 0) {
    args.push(...params.extraArgs);
  }

  args.push(params.outputPath);
  return args;
}

function parseProgressLine(line: string) {
  const result: any = {};
  const frameMatch = line.match(/frame=\s*(\d+)/);
  if (frameMatch) result.frame = parseInt(frameMatch[1], 10);
  const fpsMatch = line.match(/fps=\s*([\d.]+)/);
  if (fpsMatch) result.fps = parseFloat(fpsMatch[1]);
  const timeMatch = line.match(/time=\s*([\d:.]+)/);
  if (timeMatch) result.time = timeMatch[1];
  const speedMatch = line.match(/speed=\s*([\d.]+)x/);
  if (speedMatch) result.speed = speedMatch[1];
  return result;
}

function parseFraction(frac: string): number {
  const parts = frac.split('/');
  if (parts.length === 2 && +parts[1] !== 0) {
    return Math.round(+parts[0] / +parts[1]);
  }
  return Math.round(+frac || 0);
}

function formatProbeSize(bytes: number): string {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function getMediaInfo(filePath: string): Promise<{
  format: string; duration: string; resolution: string;
  videoCodec: string; audioCodec: string; fps: number;
  bitrate: string; fileSize: string;
}> {
  const empty = { format: '—', duration: '—', resolution: '—', videoCodec: '—', audioCodec: '—', fps: 0, bitrate: '—', fileSize: '—' };

  return new Promise((resolve) => {
    logger.info(`[ffprobe] 获取媒体信息: ${filePath}`);
    const proc = spawn(ffmpegConfig.getFfprobe(), [
      '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath,
    ]);

    let stdout = '';
    proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        logger.warn(`[ffprobe] 退出码 ${code} — 文件可能损坏或不受支持`);
        resolve(empty);
        return;
      }
      try {
        const info = JSON.parse(stdout);
        const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');
        const fmt = info.format || {};

        const durationSec = parseFloat(fmt.duration || '0');
        const h = Math.floor(durationSec / 3600);
        const m = Math.floor((durationSec % 3600) / 60);
        const s = Math.floor(durationSec % 60);

        const result = {
          format: fmt.format_name?.split(',')[0] || '—',
          duration: fmt.duration ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : '—',
          resolution: videoStream ? `${videoStream.width || '?'}×${videoStream.height || '?'}` : '—',
          videoCodec: videoStream?.codec_name || '—',
          audioCodec: audioStream?.codec_name || '—',
          fps: videoStream?.r_frame_rate ? parseFraction(videoStream.r_frame_rate) : 0,
          bitrate: fmt.bit_rate ? `${(parseInt(fmt.bit_rate) / 1000000).toFixed(1)} Mbps` : '—',
          fileSize: fmt.size ? formatProbeSize(parseInt(fmt.size)) : '—',
        };
        logger.info(`[ffprobe] 解析成功: ${result.resolution} ${result.videoCodec} ${result.duration}`);
        resolve(result);
      } catch (err: any) {
        logger.error(`[ffprobe] JSON 解析失败: ${err.message}`);
        resolve(empty);
      }
    });

    proc.on('error', (err) => {
      logger.error(`[ffprobe] 启动失败: ${err.message} — 请确认 ffprobe 已安装并在 PATH 中`);
      resolve(empty);
    });
  });
}

export function registerFFmpegHandlers() {
  ipcMain.handle('ffmpeg:run', async (event, params: FFmpegRunParams) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('No window found');

    const args = buildFFmpegArgs(params);
    const cmd = ffmpegConfig.getFfmpeg();
    const cmdLine = `${cmd} ${args.join(' ')}`;
    logger.info(`[ffmpeg] 开始转码: ${cmdLine}`);

    return new Promise<string>((resolve, reject) => {
      const proc = spawn(cmd, args);
      activeTasks.set(params.taskId, proc);

      let stderr = '';

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.includes('frame=') || line.includes('time=')) {
            const progress = parseProgressLine(line);
            progress.taskId = params.taskId;

            if (progress.time) {
              const [h, m, sec] = progress.time.split(':').map(Number);
              const currentSec = h * 3600 + m * 60 + sec;
              progress.percent = Math.min(99, Math.round(currentSec / 60 * 100));
            }

            win?.webContents.send('ffmpeg:progress', progress);
          }
        }
      });

      proc.on('close', (code) => {
        activeTasks.delete(params.taskId);
        if (code === 0) {
          logger.info(`[ffmpeg] 转码完成: ${params.outputPath}`);
          win?.webContents.send('ffmpeg:done', { taskId: params.taskId, outputPath: params.outputPath });
          resolve(params.outputPath);
        } else {
          const errMsg = `FFmpeg exited with code ${code}: ${stderr.slice(-500)}`;
          logger.error(`[ffmpeg] ${errMsg}`);
          win?.webContents.send('ffmpeg:error', { taskId: params.taskId, error: errMsg });
          reject(new Error(errMsg));
        }
      });

      proc.on('error', (err) => {
        activeTasks.delete(params.taskId);
        const errMsg = `无法启动 FFmpeg: ${err.message}。请确认 ffmpeg 已安装并在 PATH 中。`;
        logger.error(`[ffmpeg] ${errMsg}`);
        win?.webContents.send('ffmpeg:error', { taskId: params.taskId, error: errMsg });
        reject(new Error(errMsg));
      });
    });
  });

  ipcMain.on('ffmpeg:cancel', (_event, taskId: string) => {
    const proc = activeTasks.get(taskId);
    if (proc) {
      logger.info(`[ffmpeg] 取消任务: ${taskId}`);
      proc.kill('SIGTERM');
      activeTasks.delete(taskId);
    }
  });

  ipcMain.handle('file:getInfo', async (_event, filePath: string) => {
    return await getMediaInfo(filePath);
  });
}
