import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, Space, Alert, message } from 'antd';
import {
  CaretRightOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import OutputSettings, { OutputSettingsValues } from '../shared/OutputSettings';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';

let fileIdCounter = 0;

const defaultSettings: OutputSettingsValues = {
  outputFormat: 'mp4',
  videoCodec: 'libx264',
  audioCodec: 'aac',
  outputDir: '',
  preset: 'medium',
  resolution: '',
  bitrate: '',
  outputName: 'output',
  frameRate: 0,
  crf: 23,
  gop: 0,
  profile: '',
  pixelFormat: '',
  colorSpace: '',
  deinterlace: false,
  videoFilter: '',
  audioChannels: '',
  sampleRate: '',
  volume: 100,
  audioBitrate: '',
  denoise: false,
  fadeIn: 0,
  fadeOut: 0,
  audioFilter: '',
  gpuAccel: false,
  hardwareEncoder: '',
  multiThread: false,
  logLevel: 'info',
  customArgs: '',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function buildFFmpegCommand(
  inputPath: string,
  outputPath: string,
  settings: OutputSettingsValues
): string {
  const parts = ['ffmpeg -y'];
  parts.push(`-i "${inputPath}"`);

  // Codec
  const vCodec = settings.gpuAccel && settings.hardwareEncoder
    ? settings.hardwareEncoder
    : settings.videoCodec;
  if (settings.gpuAccel) parts.push('-hwaccel auto');
  if (vCodec) parts.push(`-c:v ${vCodec}`);
  if (settings.audioCodec) parts.push(`-c:a ${settings.audioCodec}`);

  // Video params
  if (settings.frameRate > 0) parts.push(`-r ${settings.frameRate}`);
  if (settings.bitrate) parts.push(`-b:v ${settings.bitrate}`);
  if (settings.crf >= 0 && vCodec !== 'copy') parts.push(`-crf ${settings.crf}`);
  if (settings.preset && vCodec !== 'copy') parts.push(`-preset ${settings.preset}`);
  if (settings.gop > 0) parts.push(`-g ${settings.gop}`);
  if (settings.profile) parts.push(`-profile:v ${settings.profile}`);
  if (settings.pixelFormat) parts.push(`-pix_fmt ${settings.pixelFormat}`);
  if (settings.colorSpace) parts.push(`-colorspace ${settings.colorSpace}`);
  if (settings.multiThread) parts.push('-threads 0');

  // Video filters (merge into single -vf chain)
  const vf: string[] = [];
  if (settings.resolution) vf.push(`scale=${settings.resolution}`);
  if (settings.deinterlace) vf.push('yadif');
  if (settings.videoFilter) vf.push(settings.videoFilter);
  if (vf.length > 0) parts.push(`-vf "${vf.join(',')}"`);

  // Audio params
  if (settings.audioBitrate) parts.push(`-b:a ${settings.audioBitrate}`);
  if (settings.audioChannels) parts.push(`-ac ${settings.audioChannels === 'mono' ? '1' : settings.audioChannels === 'stereo' ? '2' : '6'}`);
  if (settings.sampleRate) parts.push(`-ar ${settings.sampleRate}`);

  // Audio filters (merge into single -af chain)
  const af: string[] = [];
  if (settings.volume !== 100) af.push(`volume=${settings.volume / 100}`);
  if (settings.denoise) af.push('afftdn');
  if (settings.fadeIn > 0) af.push(`afade=t=in:d=${settings.fadeIn}`);
  if (settings.fadeOut > 0) af.push(`afade=t=out:d=${settings.fadeOut}`);
  if (settings.audioFilter) af.push(settings.audioFilter);
  if (af.length > 0) parts.push(`-af "${af.join(',')}"`);

  if (settings.logLevel && settings.logLevel !== 'info') parts.push(`-loglevel ${settings.logLevel}`);
  if (settings.customArgs) parts.push(settings.customArgs);

  parts.push(`"${outputPath}"`);
  return parts.join(' \\\n  ');
}

export default function VideoConvert() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [settings, setSettings] = useState<OutputSettingsValues>(defaultSettings);
  const [ffmpegOk, setFfmpegOk] = useState(true);
  const { addTask, updateTask } = useTaskContext();

  useEffect(() => {
    window.electronAPI?.app?.getFfmpegStatus().then((s) => {
      setFfmpegOk(s?.ffmpeg ?? false);
    });
  }, []);

  const { run, isRunning, progress } = useFFmpeg({
    onProgress: (p) => {
      // Update task progress in shared context
      updateTask(p.taskId, {
        progress: p.percent || 0,
        speed: p.speed || '—',
        remaining: p.time || '—',
      });
    },
    onComplete: (taskId, outputPath) => {
      message.success(`输出文件: ${outputPath}`);
      updateTask(taskId, { status: 'done', progress: 100 });
    },
    onError: (taskId, error) => {
      updateTask(taskId, { status: 'error' });
    },
  });

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const mediaFiles: MediaFile[] = newFiles.map((f) => {
      fileIdCounter += 1;
      return {
        key: `file-${fileIdCounter}`,
        name: f.name,
        path: (f as any).path || f.name,
        duration: '—',
        resolution: '—',
        fileSize: formatFileSize(f.size),
        status: 'ready' as const,
        type: f.type.startsWith('video/')
          ? 'video'
          : f.type.startsWith('audio/')
          ? 'audio'
          : ('image' as const),
      };
    });
    setFiles((prev) => [...prev, ...mediaFiles]);
    if (!selectedFile && mediaFiles.length > 0) {
      setSelectedFile(mediaFiles[0]);
    }

    // Fetch real metadata via ffprobe
    for (const mf of mediaFiles) {
      try {
        const info = await window.electronAPI?.file?.getInfo(mf.path);
        if (info) {
          setFiles((prev) =>
            prev.map((f) =>
              f.key === mf.key
                ? { ...f, duration: info.duration, resolution: info.resolution }
                : f
            )
          );
          setSelectedFile((prev) =>
            prev?.key === mf.key
              ? { ...prev, duration: info.duration, resolution: info.resolution }
              : prev
          );
        }
      } catch {
        // ffprobe unavailable, keep placeholder values
      }
    }
  }, [selectedFile]);

  const handleRemove = useCallback((key: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.key !== key);
      if (selectedFile?.key === key) {
        setSelectedFile(next.length > 0 ? next[0] : null);
      }
      return next;
    });
  }, [selectedFile]);

  const handleSettingsChange = useCallback((partial: Partial<OutputSettingsValues>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleStartConvert = useCallback(() => {
    if (!ffmpegOk) {
      message.error('FFmpeg 未安装，无法执行转码。请先安装 FFmpeg。');
      return;
    }

    if (files.length === 0) {
      message.warning('请先添加文件');
      return;
    }

    if (!settings.outputDir) {
      message.warning('请选择输出目录');
      return;
    }

    const file = files[0];
    const ext = settings.outputFormat;
    const sep = settings.outputDir.includes('\\') ? '\\' : '/';
    const outputPath = `${settings.outputDir}${settings.outputDir.endsWith(sep) ? '' : sep}${settings.outputName || 'output'}.${ext}`;
    const taskId = `task-${Date.now()}`;

    // Add to shared task list
    addTask({
      key: taskId,
      name: `${file.name} → ${settings.outputName || 'output'}.${ext}`,
      inputFile: file.path,
      outputFile: outputPath,
      progress: 0,
      speed: '—',
      remaining: '—',
      status: 'processing',
    });

    run({
      taskId,
      inputPath: file.path,
      outputPath,
      videoCodec: settings.videoCodec,
      audioCodec: settings.audioCodec,
      resolution: settings.resolution || undefined,
      fps: settings.frameRate > 0 ? settings.frameRate : undefined,
      bitrate: settings.bitrate || undefined,
      crf: settings.crf,
      preset: settings.preset,
      extraArgs: settings.customArgs ? settings.customArgs.split(/\s+/) : undefined,
    });
  }, [files, settings, run, ffmpegOk, addTask]);

  const command = files.length > 0 && settings.outputDir
    ? buildFFmpegCommand(
        files[0].path,
        (() => {
          const sep = settings.outputDir.includes('\\') ? '\\' : '/';
          return `${settings.outputDir}${settings.outputDir.endsWith(sep) ? '' : sep}${settings.outputName || 'output'}.${settings.outputFormat}`;
        })(),
        settings
      )
    : '';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* FFmpeg Warning */}
        {!ffmpegOk && (
          <Alert
            type="warning"
            message="FFmpeg 未检测到"
            description="转码功能需要 FFmpeg。请在首页点击「下载 FFmpeg」安装，或确保 ffmpeg 在系统 PATH 中。"
            icon={<ExclamationCircleOutlined />}
            showIcon
          />
        )}

        {/* File Drop Zone */}
        <Card title="选择文件">
          <FileDropZone onFilesAdded={handleFilesAdded} />
          <FileInfoTable
            files={files}
            onRemove={handleRemove}
            onPreview={(file) => setSelectedFile(file)}
          />
        </Card>

        {/* Output Settings */}
        <OutputSettings values={settings} onChange={handleSettingsChange} />

        {/* Command Preview */}
        {command && (
          <Card title="命令预览" style={{ marginTop: 0 }}>
            <CommandPreview command={command} />
          </Card>
        )}

        {/* Action Bar */}
        <Card style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {files.length > 0
                ? `已选择 ${files.length} 个文件 · ${isRunning ? (progress ? `进度 ${progress.percent}%` : '处理中...') : '就绪'}`
                : '请先添加文件'}
            </div>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<CaretRightOutlined />}
                onClick={handleStartConvert}
                loading={isRunning}
                disabled={files.length === 0}
              >
                {isRunning ? '转换中...' : '开始转换'}
              </Button>
              <Button size="large" icon={<PauseCircleOutlined />} disabled={!isRunning}>
                暂停
              </Button>
              <Button size="large" icon={<StopOutlined />} disabled={!isRunning}>
                停止
              </Button>
            </Space>
          </div>
        </Card>
      </div>

      {/* Preview Panel */}
      <PreviewPanel file={selectedFile} />
    </div>
  );
}
