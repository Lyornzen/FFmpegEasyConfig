import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Select, Input, InputNumber, Slider, message, Alert, Radio } from 'antd';
import { RotateRightOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;

function formatFileSize(bytes: number): string { if (bytes === 0) return '—'; const u = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }

interface RotatePreset { label: string; value: string; desc: string; }
const rotatePresets: RotatePreset[] = [
  { label: '顺时针 90°', value: 'transpose=1', desc: '向右旋转 90 度' },
  { label: '逆时针 90°', value: 'transpose=2', desc: '向左旋转 90 度' },
  { label: '顺时针 90° + 翻转', value: 'transpose=3', desc: '旋转并水平翻转' },
  { label: '180°', value: 'transpose=2,transpose=2', desc: '旋转 180 度' },
  { label: '水平翻转', value: 'hflip', desc: '左右镜像' },
  { label: '垂直翻转', value: 'vflip', desc: '上下镜像' },
  { label: '自定义角度', value: 'custom', desc: '任意角度旋转' },
];

let fileIdCounter = 0;

export default function VideoRotate() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState(true);
  const [preset, setPreset] = useState('transpose=1');
  const [customAngle, setCustomAngle] = useState(45);
  const [videoCodec, setVideoCodec] = useState('libx264');
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
      if (info) { setFiles((prev) => prev.map((f) => f.key === mf.key ? { ...f, duration: info.duration, resolution: info.resolution } : f)); setSelectedFile((prev) => prev?.key === mf.key ? { ...prev!, duration: info.duration, resolution: info.resolution } : prev); }
    }
  }, [selectedFile]);

  const buildFilter = (): string => {
    if (preset === 'custom') {
      const rad = (customAngle * Math.PI) / 180;
      return `rotate=${rad.toFixed(4)}`;
    }
    return preset;
  };

  const handleStart = useCallback(() => {
    if (!ffmpegOk) { message.error('FFmpeg 未安装'); return; }
    if (files.length === 0) { message.warning('请先添加文件'); return; }
    if (!outputDir) { message.warning('请选择输出目录'); return; }
    const file = files[0];
    const sep = outputDir.includes('\\') ? '\\' : '/';
    const out = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${file.name.replace(/\.[^.]+$/, '')}_rotated.${outputFormat}`;
    const taskId = `task-${Date.now()}`;
    addTask({ key: taskId, name: `旋转 ${file.name}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
    run({ taskId, inputPath: file.path, outputPath: out, videoCodec, audioCodec: 'aac', extraArgs: ['-vf', buildFilter()] });
  }, [files, outputDir, outputFormat, videoCodec, preset, customAngle, run, ffmpegOk, addTask]);

  const command = files.length > 0 && outputDir
    ? `ffmpeg -y -i "${files[0].path}" -vf "${buildFilter()}" -c:v ${videoCodec} -c:a aac "${joinPath(outputDir, `${files[0].name.replace(/\.[^.]+$/, '')}_rotated.${outputFormat}`)}"`
    : '';

  const selectedPresetLabel = rotatePresets.find((r) => r.value === preset)?.label || '自定义';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!ffmpegOk && <Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined />} showIcon />}
        <Card title="选择视频">
          <FileDropZone onFilesAdded={handleFilesAdded} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="支持 MP4, AVI, MKV, MOV 等视频格式" />
          <FileInfoTable files={files} onRemove={(k) => { setFiles((p) => p.filter((f) => f.key !== k)); if (selectedFile?.key === k) setSelectedFile(files.length > 1 ? files[0] : null); }} onPreview={setSelectedFile} />
        </Card>

        <Card title="旋转 / 翻转">
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>当前: {selectedPresetLabel}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {rotatePresets.map((r) => (
              <Card
                key={r.value}
                size="small"
                hoverable
                style={{ cursor: 'pointer', border: preset === r.value ? '2px solid #1677ff' : '1px solid #e5e7eb', background: preset === r.value ? '#e6f4ff' : '#fff' }}
                onClick={() => setPreset(r.value)}
              >
                <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{r.desc}</div>
              </Card>
            ))}
          </div>
          {preset === 'custom' && (
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>旋转角度: {customAngle}°</label>
              <Slider min={1} max={359} value={customAngle} onChange={setCustomAngle} />
            </div>
          )}
        </Card>

        <Card title="输出设置">
          <Space size={24} wrap>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>编码器</label><Select value={videoCodec} onChange={setVideoCodec} style={{ width: 200 }}><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option><Option value="copy">复制流</Option></Select></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>格式</label><Select value={outputFormat} onChange={setOutputFormat} style={{ width: 100 }}><Option value="mp4">MP4</Option><Option value="mkv">MKV</Option><Option value="mov">MOV</Option></Select></div>
            <div style={{ flex: 1, minWidth: 280 }}><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>输出目录</label><Input placeholder="选择输出目录..." value={outputDir} onChange={(e) => setOutputDir(e.target.value)} addonAfter={<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={async () => { const d = await window.electronAPI?.file?.openDirDialog(); if (d) setOutputDir(d); }}>浏览</span>} /></div>
          </Space>
        </Card>

        {command && <Card title="命令预览"><CommandPreview command={command} /></Card>}

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{files.length > 0 ? `旋转: ${selectedPresetLabel}` : '请先添加文件'}</span>
            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart} loading={isRunning} disabled={files.length === 0}>开始旋转</Button>
          </div>
        </Card>
      </div>
      <PreviewPanel file={selectedFile} />
    </div>
  );
}
