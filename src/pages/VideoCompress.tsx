import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Select, Input, Slider, message, Alert } from 'antd';
import { CompressOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';

const { Option } = Select;

function formatFileSize(bytes: number): string { if (bytes === 0) return '—'; const u = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }

let fileIdCounter = 0;

export default function VideoCompress() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState(true);
  const [videoCodec, setVideoCodec] = useState('libx264');
  const [crf, setCrf] = useState(28);
  const [preset, setPreset] = useState('medium');
  const [resolution, setResolution] = useState('');
  const [bitrate, setBitrate] = useState('');
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [outputDir, setOutputDir] = useState('');
  const { addTask, updateTask } = useTaskContext();

  useEffect(() => { window.electronAPI?.app?.getFfmpegStatus().then((s) => setFfmpegOk(s?.ffmpeg ?? false)); }, []);

  const { run, isRunning, progress } = useFFmpeg({
    onProgress: (p) => updateTask(p.taskId, { progress: p.percent || 0, speed: p.speed || '—' }),
    onComplete: (taskId, out) => { message.success(`输出: ${out}`); updateTask(taskId, { status: 'done', progress: 100 }); },
    onError: (taskId) => updateTask(taskId, { status: 'error' }),
  });

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const mfs: MediaFile[] = newFiles.map((f) => { fileIdCounter += 1; return { key: `file-${fileIdCounter}`, name: f.name, path: (f as any).path || f.name, duration: '—', resolution: '—', fileSize: formatFileSize(f.size), status: 'ready' as const, type: 'video' as const }; });
    setFiles((prev) => [...prev, ...mfs]);
    if (!selectedFile && mfs.length > 0) setSelectedFile(mfs[0]);
    for (const mf of mfs) {
      const info = await window.electronAPI?.file?.getInfo(mf.path);
      if (info) {
        setFiles((prev) => prev.map((f) => f.key === mf.key ? { ...f, duration: info.duration, resolution: info.resolution } : f));
        setSelectedFile((prev) => prev?.key === mf.key ? { ...prev!, duration: info.duration, resolution: info.resolution } : prev);
      }
    }
  }, [selectedFile]);

  const handleStart = useCallback(() => {
    if (!ffmpegOk) { message.error('FFmpeg 未安装'); return; }
    if (files.length === 0) { message.warning('请先添加文件'); return; }
    if (!outputDir) { message.warning('请选择输出目录'); return; }
    const file = files[0];
    const sep = outputDir.includes('\\') ? '\\' : '/';
    const out = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${file.name.replace(/\.[^.]+$/, '')}_compressed.${outputFormat}`;
    const taskId = `task-${Date.now()}`;
    addTask({ key: taskId, name: `压缩 ${file.name}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
    run({ taskId, inputPath: file.path, outputPath: out, videoCodec, audioCodec: 'aac', resolution: resolution || undefined, bitrate: bitrate || undefined, crf, preset });
  }, [files, outputDir, outputFormat, videoCodec, crf, preset, resolution, bitrate, run, ffmpegOk, addTask]);

  const command = files.length > 0 && outputDir
    ? `ffmpeg -y -i "${files[0].path}" -c:v ${videoCodec} -crf ${crf} -preset ${preset} -c:a aac${resolution ? ` -vf "scale=${resolution}"` : ''}${bitrate ? ` -b:v ${bitrate}` : ''} "${outputDir}/${files[0].name.replace(/\.[^.]+$/, '')}_compressed.${outputFormat}"`
    : '';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!ffmpegOk && <Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined />} showIcon />}
        <Card title="选择文件">
          <FileDropZone onFilesAdded={handleFilesAdded} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="支持 MP4, AVI, MKV, MOV 等视频格式" />
          <FileInfoTable files={files} onRemove={(k) => { setFiles((p) => p.filter((f) => f.key !== k)); if (selectedFile?.key === k) setSelectedFile(files.length > 1 ? files[0] : null); }} onPreview={setSelectedFile} />
        </Card>

        <Card title="压缩参数">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>编码器</label>
              <Select value={videoCodec} onChange={setVideoCodec} style={{ width: '100%' }}>
                <Option value="libx264">H.264</Option><Option value="libx265">H.265 (更小)</Option><Option value="libvpx-vp9">VP9</Option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>CRF (质量, 越高压缩越多)</label>
              <Slider min={18} max={40} value={crf} onChange={setCrf} marks={{ 18: '高', 23: '默认', 28: '压缩', 35: '强压缩', 40: '极小' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>预设</label>
              <Select value={preset} onChange={setPreset} style={{ width: '100%' }}>
                <Option value="ultrafast">ultrafast</Option><Option value="veryfast">veryfast</Option><Option value="fast">fast</Option><Option value="medium">medium</Option><Option value="slow">slow (更小)</Option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>缩放分辨率</label>
              <Select value={resolution} onChange={setResolution} style={{ width: '100%' }}>
                <Option value="">保持原始</Option><Option value="1920:1080">1080p</Option><Option value="1280:720">720p</Option><Option value="854:480">480p</Option><Option value="640:360">360p</Option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>目标比特率</label>
              <Select value={bitrate} onChange={setBitrate} style={{ width: '100%' }}>
                <Option value="">自动 (CRF 控制)</Option><Option value="8M">8 Mbps</Option><Option value="5M">5 Mbps</Option><Option value="2M">2 Mbps</Option><Option value="1M">1 Mbps</Option><Option value="500k">500 kbps</Option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>输出格式</label>
              <Select value={outputFormat} onChange={setOutputFormat} style={{ width: '100%' }}>
                <Option value="mp4">MP4</Option><Option value="mkv">MKV</Option><Option value="webm">WebM</Option>
              </Select>
            </div>
          </div>
        </Card>

        <Card title="输出设置">
          <Input placeholder="选择输出目录..." value={outputDir} onChange={(e) => setOutputDir(e.target.value)} addonAfter={<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={async () => { const d = await window.electronAPI?.file?.openDirDialog(); if (d) setOutputDir(d); }}>浏览</span>} />
        </Card>

        {command && <Card title="命令预览"><CommandPreview command={command} /></Card>}

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{files.length > 0 ? `${isRunning ? '压缩中...' : '就绪'}` : '请先添加文件'}</span>
            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart} loading={isRunning} disabled={files.length === 0}>开始压缩</Button>
          </div>
        </Card>
      </div>
      <PreviewPanel file={selectedFile} />
    </div>
  );
}
