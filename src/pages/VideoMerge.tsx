import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Select, Input, Slider, message, Alert, Tag, Empty } from 'antd';
import {
  MergeCellsOutlined, CaretRightOutlined, ExclamationCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined,
} from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import type { MediaFile } from '../shared/FileInfoTable';

const { Option } = Select;

interface FileProbe {
  key: string; name: string; path: string; fileSize: string;
  resolution: string; videoCodec: string; audioCodec: string; duration: string;
}

function formatFileSize(bytes: number): string { if (bytes === 0) return '—'; const u = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }

let fileIdCounter = 0;

export default function VideoMerge() {
  const [files, setFiles] = useState<FileProbe[]>([]);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState(true);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [videoCodec, setVideoCodec] = useState('libx264');
  const [audioCodec, setAudioCodec] = useState('aac');
  const [crf, setCrf] = useState(23);
  const [preset, setPreset] = useState('medium');
  const [resolution, setResolution] = useState('');
  const [bitrate, setBitrate] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const { addTask, updateTask } = useTaskContext();

  const codecMismatch = files.length >= 2 && (
    files.some((f) => f.videoCodec !== files[0].videoCodec || f.audioCodec !== files[0].audioCodec || f.resolution !== files[0].resolution)
  );

  const previewFile: MediaFile | null = (() => {
    const f = files.find((x) => x.key === previewKey);
    if (!f) return null;
    return { key: f.key, name: f.name, path: f.path, duration: f.duration, resolution: f.resolution, fileSize: f.fileSize, status: 'ready' as const, type: 'video' as const };
  })();

  useEffect(() => { window.electronAPI?.app?.getFfmpegStatus().then((s) => setFfmpegOk(s?.ffmpeg ?? false)); }, []);

  const { run, isRunning, progress } = useFFmpeg({
    onProgress: (p) => updateTask(p.taskId, { progress: p.percent || 0, speed: p.speed || '—' }),
    onComplete: (taskId, out) => { message.success(`输出: ${out}`); updateTask(taskId, { status: 'done', progress: 100 }); },
    onError: (taskId) => updateTask(taskId, { status: 'error' }),
  });

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const mfs: FileProbe[] = newFiles.map((f) => { fileIdCounter += 1; return { key: `file-${fileIdCounter}`, name: f.name, path: (f as any).path || f.name, fileSize: formatFileSize(f.size), resolution: '—', videoCodec: '—', audioCodec: '—', duration: '—' }; });
    setFiles((prev) => [...prev, ...mfs]);
    if (!previewKey && mfs.length > 0) setPreviewKey(mfs[0].key);
    for (const mf of mfs) {
      const info = await window.electronAPI?.file?.getInfo(mf.path);
      if (info) {
        setFiles((prev) => prev.map((f) => f.key === mf.key ? { ...f, resolution: info.resolution, videoCodec: info.videoCodec, audioCodec: info.audioCodec, duration: info.duration } : f));
      }
    }
  }, [previewKey]);

  const handleRemove = (key: string) => {
    setFiles((prev) => prev.filter((f) => f.key !== key));
    if (previewKey === key) {
      const remaining = files.filter((f) => f.key !== key);
      setPreviewKey(remaining.length > 0 ? remaining[0].key : null);
    }
  };

  const handleMoveUp = (idx: number) => { if (idx === 0) return; setFiles((prev) => { const arr = [...prev]; [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]]; return arr; }); };
  const handleMoveDown = (idx: number) => { if (idx === files.length - 1) return; setFiles((prev) => { const arr = [...prev]; [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]]; return arr; }); };

  const buildConcatFilter = (): string => {
    const n = files.length;
    return files.map((_, i) => `[${i}:v][${i}:a]`).join('') + `concat=n=${n}:v=1:a=1[outv][outa]`;
  };

  const handleStart = useCallback(() => {
    if (!ffmpegOk) { message.error('FFmpeg 未安装'); return; }
    if (files.length < 2) { message.warning('请至少添加 2 个文件'); return; }
    if (!outputDir) { message.warning('请选择输出目录'); return; }
    const sep = outputDir.includes('\\') ? '\\' : '/';
    const out = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}merged.${outputFormat}`;
    const taskId = `task-${Date.now()}`;
    addTask({ key: taskId, name: `合并 ${files.length} 个文件`, inputFile: files.map((f) => f.name).join(', '), outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
    const extraArgs = ['-filter_complex', buildConcatFilter(), '-map', '[outv]', '-map', '[outa]', ...(resolution ? ['-s', resolution.replace(':', 'x')] : [])];
    run({ taskId, inputPath: files[0].path, inputPaths: files.map((f) => f.path), outputPath: out, videoCodec, audioCodec, resolution: resolution || undefined, bitrate: bitrate || undefined, crf, preset, extraArgs });
  }, [files, outputDir, outputFormat, videoCodec, audioCodec, crf, preset, resolution, bitrate, run, ffmpegOk, addTask]);

  const command = files.length >= 2
    ? `ffmpeg -y ${files.map((f) => `-i "${f.path}"`).join(' ')} -filter_complex ${buildConcatFilter()} -map "[outv]" -map "[outa]" -c:v ${videoCodec} -crf ${crf} -preset ${preset} -c:a ${audioCodec}${resolution ? ` -s ${resolution.replace(':', 'x')}` : ''}${bitrate ? ` -b:v ${bitrate}` : ''} "${outputDir || '{目录}'}/merged.${outputFormat}"`
    : '';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!ffmpegOk && <Alert type="warning" message="FFmpeg 未检测到" showIcon icon={<ExclamationCircleOutlined />} />}
        {codecMismatch && <Alert type="warning" message="检测到编码参数不一致" description="文件之间的编码器/分辨率不同，将使用 concat filter 重新编码合并。" showIcon icon={<ExclamationCircleOutlined />} />}

        <Card title="添加文件（按合并顺序排列）">
          <FileDropZone onFilesAdded={handleFilesAdded} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm,.ts" hint="拖入多个文件按顺序合并" />
          {files.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {files.map((f, idx) => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: 8, marginBottom: 6, gap: 8 }}>
                  <span style={{ color: '#9ca3af', fontSize: 12, minWidth: 24 }}>#{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{f.name}</span>
                  <Tag>{f.videoCodec}</Tag><Tag>{f.resolution}</Tag>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{f.duration}</span>
                  <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => handleMoveUp(idx)} />
                  <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={idx === files.length - 1} onClick={() => handleMoveDown(idx)} />
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemove(f.key)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="编码参数">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>视频编码器</label><Select value={videoCodec} onChange={setVideoCodec} style={{ width: '100%' }}><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option><Option value="libvpx-vp9">VP9</Option></Select></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>CRF (质量)</label><Slider min={0} max={51} value={crf} onChange={setCrf} marks={{ 0: '无损', 18: '高', 23: '默认', 28: '中', 51: '低' }} /></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>预设</label><Select value={preset} onChange={setPreset} style={{ width: '100%' }}><Option value="ultrafast">ultrafast</Option><Option value="veryfast">veryfast</Option><Option value="medium">medium</Option><Option value="slow">slow</Option></Select></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>音频编码器</label><Select value={audioCodec} onChange={setAudioCodec} style={{ width: '100%' }}><Option value="aac">AAC</Option><Option value="libmp3lame">MP3</Option><Option value="libopus">Opus</Option></Select></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>分辨率</label><Select value={resolution} onChange={setResolution} style={{ width: '100%' }}><Option value="">保持</Option><Option value="1920:1080">1080p</Option><Option value="1280:720">720p</Option></Select></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>比特率</label><Select value={bitrate} onChange={setBitrate} style={{ width: '100%' }}><Option value="">自动</Option><Option value="20M">20M</Option><Option value="10M">10M</Option><Option value="5M">5M</Option></Select></div>
          </div>
        </Card>

        <Card title="输出设置">
          <Space size={24} wrap>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>格式</label><Select value={outputFormat} onChange={setOutputFormat} style={{ width: 100 }}><Option value="mp4">MP4</Option><Option value="mkv">MKV</Option><Option value="mov">MOV</Option></Select></div>
            <div style={{ flex: 1, minWidth: 300 }}><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>输出目录</label><Input placeholder="选择输出目录..." value={outputDir} onChange={(e) => setOutputDir(e.target.value)} addonAfter={<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={async () => { const d = await window.electronAPI?.file?.openDirDialog(); if (d) setOutputDir(d); }}>浏览</span>} /></div>
          </Space>
        </Card>

        {command && <Card title="命令预览"><CommandPreview command={command} /></Card>}

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{files.length >= 2 ? `已添加 ${files.length} 个文件${codecMismatch ? ' · 编码不同，重新编码' : ''}` : '请添加至少 2 个文件'}</span>
            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart} loading={isRunning} disabled={files.length < 2}>开始合并</Button>
          </div>
        </Card>
      </div>

      {/* Right: Preview panel with file selector */}
      <div style={{ width: 420, flexShrink: 0 }}>
        {files.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Select
              value={previewKey}
              onChange={setPreviewKey}
              style={{ width: '100%' }}
              placeholder="选择要预览的文件"
            >
              {files.map((f, i) => (
                <Option key={f.key} value={f.key}>#{i + 1} {f.name}</Option>
              ))}
            </Select>
          </div>
        )}
        <PreviewPanel file={previewFile} />
      </div>
    </div>
  );
}
