import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, Button, Space, Select, Input, InputNumber, message, Alert, Radio } from 'antd';
import { SplitCellsOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;

function formatFileSize(bytes: number): string { if (bytes === 0) return '—'; const u = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }

function timeToSec(t: string): number { const p = t.split(':').map(Number); return (p[0]||0)*3600 + (p[1]||0)*60 + (p[2]||0); }
function secToTime(s: number): string { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
function parseDuration(dur: string): number { return dur === '—' ? 600 : timeToSec(dur); }

let fileIdCounter = 0;

export default function VideoSplit() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState(true);
  const [splitMode, setSplitMode] = useState<'time' | 'segments'>('time');
  const [segmentTime, setSegmentTime] = useState('00:10:00');
  const [numSegments, setNumSegments] = useState(4);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [videoCodec, setVideoCodec] = useState('copy');
  const [outputDir, setOutputDir] = useState('');
  const { addTask, updateTask } = useTaskContext();

  const totalDuration = useMemo(() => selectedFile ? parseDuration(selectedFile.duration) : 600, [selectedFile]);

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
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const taskId = `task-${Date.now()}`;
    const outPattern = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${baseName}_%03d.${outputFormat}`;

    addTask({ key: taskId, name: `分割 ${file.name}`, inputFile: file.path, outputFile: outPattern, progress: 0, speed: '—', remaining: '—', status: 'processing' });

    // Calculate actual segment time
    const segTime = splitMode === 'time' ? segmentTime : secToTime(Math.ceil(totalDuration / numSegments));

    // segment muxer args only (no codec — that's handled by run() params)
    const extraArgs = [
      '-f', 'segment',
      '-segment_time', segTime,
      '-reset_timestamps', '1',
    ];

    run({
      taskId,
      inputPath: file.path,
      outputPath: outPattern,
      videoCodec,
      audioCodec: 'copy',
      extraArgs,
    });
  }, [files, outputDir, outputFormat, videoCodec, splitMode, segmentTime, numSegments, totalDuration, run, ffmpegOk, addTask]);

  const segTime = splitMode === 'time' ? segmentTime : secToTime(Math.ceil(totalDuration / numSegments));
  const approxCount = splitMode === 'time' ? Math.ceil(totalDuration / Math.max(1, timeToSec(segmentTime))) : numSegments;

  const command = files.length > 0 && outputDir
    ? `ffmpeg -y -i "${files[0].path}" -c:v ${videoCodec} -c:a copy -f segment -segment_time ${segTime} -reset_timestamps 1 "${joinPath(outputDir, `${files[0].name.replace(/\.[^.]+$/, '')}_%03d.${outputFormat}`)}"`
    : '';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!ffmpegOk && <Alert type="warning" message="FFmpeg 未检测到" showIcon icon={<ExclamationCircleOutlined />} />}
        <Card title="选择文件">
          <FileDropZone onFilesAdded={handleFilesAdded} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="支持 MP4, AVI, MKV, MOV 等视频格式" />
          <FileInfoTable files={files} onRemove={(k) => { setFiles((p) => p.filter((f) => f.key !== k)); if (selectedFile?.key === k) setSelectedFile(files.length > 1 ? files[0] : null); }} onPreview={setSelectedFile} />
        </Card>

        <Card title="分割参数">
          <Radio.Group value={splitMode} onChange={(e) => setSplitMode(e.target.value)} style={{ marginBottom: 16 }}>
            <Radio.Button value="time">按时间分段</Radio.Button>
            <Radio.Button value="segments">按段数分割</Radio.Button>
          </Radio.Group>
          <div style={{ marginTop: 12 }}>
            {splitMode === 'time' ? (
              <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>每段时长 (HH:MM:SS)</label><Input value={segmentTime} onChange={(e) => setSegmentTime(e.target.value)} placeholder="00:10:00" style={{ width: 200 }} /></div>
            ) : (
              <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>分割段数</label><InputNumber min={2} max={99} value={numSegments} onChange={(v) => setNumSegments(v ?? 4)} style={{ width: 200 }} /></div>
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              {selectedFile && selectedFile.duration !== '—'
                ? `视频总时长: ${selectedFile.duration} · 预计生成约 ${approxCount} 个文件`
                : '添加文件后可预览分割结果'}
            </div>
          </div>
          <Space size={24} style={{ marginTop: 16 }}>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>输出格式</label><Select value={outputFormat} onChange={setOutputFormat} style={{ width: 100 }}><Option value="mp4">MP4</Option><Option value="mkv">MKV</Option></Select></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>视频编码</label><Select value={videoCodec} onChange={setVideoCodec} style={{ width: 160 }}><Option value="copy">复制流 (快速)</Option><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option></Select></div>
          </Space>
        </Card>

        <Card title="输出设置">
          <Input placeholder="选择输出目录..." value={outputDir} onChange={(e) => setOutputDir(e.target.value)} addonAfter={<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={async () => { const d = await window.electronAPI?.file?.openDirDialog(); if (d) setOutputDir(d); }}>浏览</span>} />
        </Card>

        {command && <Card title="命令预览"><CommandPreview command={command} /></Card>}

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              {files.length > 0
                ? `已选择 ${files.length} 个文件 · 约 ${approxCount} 段 · ${isRunning ? (progress ? `进度 ${progress.percent}%` : '处理中...') : '就绪'}`
                : '请先添加文件'}
            </span>
            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart} loading={isRunning} disabled={files.length === 0}>开始分割</Button>
          </div>
        </Card>
      </div>
      <PreviewPanel file={selectedFile} />
    </div>
  );
}
