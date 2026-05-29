/**
 * Shared FFmpeg path configuration.
 * When the user manually selects ffmpeg/ffprobe paths,
 * they are stored here and used by both detection (main.ts)
 * and execution (ffmpeg.ts).
 */

let ffmpegPath: string | null = null;
let ffprobePath: string | null = null;

export const ffmpegConfig = {
  getFfmpeg(): string {
    return ffmpegPath || 'ffmpeg';
  },
  getFfprobe(): string {
    return ffprobePath || 'ffprobe';
  },
  setFfmpeg(p: string) {
    ffmpegPath = p;
  },
  setFfprobe(p: string) {
    ffprobePath = p;
  },
  hasCustomFfmpeg(): boolean {
    return ffmpegPath !== null;
  },
  hasCustomFfprobe(): boolean {
    return ffprobePath !== null;
  },
  reset() {
    ffmpegPath = null;
    ffprobePath = null;
  },
};
