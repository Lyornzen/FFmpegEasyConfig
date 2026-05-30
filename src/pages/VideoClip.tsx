import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, Button, Space, Input, Select, Slider, message, Alert } from 'antd';
import { CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;

function formatFileSize(bytes: number): string { if (bytes === 0) return '—'; const u = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }

// HH:MM:SS <-> total seconds
function timeToSec(t: string): number { const p = t.split(':').map(Number); return (p[0]||0)*3600 + (p[1]||0)*60 + (p[2]||0); }
function secToTime(s: number): string { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

// Parse duration string like "0:01:07" to seconds
function parseDuration(dur: string): number { return dur === '—' ? 300 : timeToSec(dur); }

let fileIdCounter = 0;

export default function VideoClip() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState(true);
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:00:05');
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [videoCodec, setVideoCodec] = useState('copy');
  const [outputDir, setOutputDir] = useState('');
  const { addTask, updateTask } = useTaskContext();

  // Get video duration in seconds for the slider max
  const totalDuration = useMemo(() => selectedFile ? parseDuration(selectedFile.duration) : 300, [selectedFile]);
  const startSec = timeToSec(startTime);
  const endSec = Math.min(timeToSec(endTime), totalDuration);

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

  // When slider changes, update both start and end time inputs
  const handleSliderChange = (values: number[]) => {
    setStartTime(secToTime(values[0]));
    setEndTime(secToTime(values[1]));
  };

  const handleStart = useCallback(() => {
    if (!ffmpegOk) { message.error('FFmpeg 未安装'); return; }
    if (files.length === 0) { message.warning('请先添加文件'); return; }
    if (!outputDir) { message.warning('请选择输出目录'); return; }
    const file = files[0];
    const clipDuration = endSec - startSec;
    if (clipDuration <= 0) { message.warning('结束时间必须大于开始时间'); return; }
    const sep = outputDir.includes('\\') ? '\\' : '/';
    const out = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${file.name.replace(/\.[^.]+$/, '')}_clip.${outputFormat}`;
    const taskId = `task-${Date.now()}`;
    addTask({ key: taskId, name: `剪辑 ${file.name}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
    run({ taskId, inputPath: file.path, outputPath: out, videoCodec, audioCodec: 'copy', extraArgs: ['-ss', startTime, '-t', secToTime(clipDuration)] });
  }, [files, outputDir, outputFormat, videoCodec, startTime, endSec, run, ffmpegOk, addTask]);

  const clipDuration = endSec - startSec;
  const command = files.length > 0 && outputDir
    ? `ffmpeg -y -ss ${startTime} -t ${secToTime(Math.max(0, clipDuration))} -i "${files[0].path}" -c:v ${videoCodec} -c:a copy "${joinPath(outputDir, `${files[0].name.replace(/\.[^.]+$/, '')}_clip.${outputFormat}`)}"`
    : '';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!ffmpegOk && <Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined />} showIcon />}
        <Card title="选择文件">
          <FileDropZone onFilesAdded={handleFilesAdded} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="支持 MP4, AVI, MKV, MOV 等视频格式" />
          <FileInfoTable files={files} onRemove={(k) => { setFiles((p) => p.filter((f) => f.key !== k)); if (selectedFile?.key === k) setSelectedFile(files.length > 1 ? files[0] : null); }} onPreview={setSelectedFile} />
        </Card>

        {/* Time Range Slider */}
        {selectedFile && selectedFile.duration !== '—' && (
          <Card title="时间轴">
            <div style={{ padding: '0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
                <span>00:00:00</span>
                <span style={{ color: '#1677ff', fontWeight: 500 }}>
                  已选: {secToTime(startSec)} – {secToTime(endSec)} ({secToTime(clipDuration)})
                </span>
                <span>{selectedFile.duration}</span>
              </div>
              <Slider
                range
                min={0}
                max={totalDuration}
                step={1}
                value={[startSec, endSec]}
                onChange={handleSliderChange}
                tooltip={{ formatter: (v) => secToTime(v || 0) }}
              />
            </div>
          </Card>
        )}

        <Card title="剪辑参数">
          <Space size={24} wrap>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>开始时间</label>
              <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="00:00:00" style={{ width: 140 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>结束时间</label>
              <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="00:00:10" style={{ width: 140 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>时长</label>
              <Input value={secToTime(Math.max(0, clipDuration))} disabled style={{ width: 120, color: '#1677ff', fontWeight: 600 }} />
            </div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>输出格式</label><Select value={outputFormat} onChange={setOutputFormat} style={{ width: 100 }}><Option value="mp4">MP4</Option><Option value="mkv">MKV</Option><Option value="mov">MOV</Option></Select></div>
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
                ? `已选择 ${files.length} 个文件 · 剪辑 ${secToTime(clipDuration)} · ${isRunning ? (progress ? `进度 ${progress.percent}%` : '处理中...') : '就绪'}`
                : '请先添加文件'}
            </span>
            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart} loading={isRunning} disabled={files.length === 0 || clipDuration <= 0}>开始剪辑</Button>
          </div>
        </Card>
      </div>
      <PreviewPanel file={selectedFile} />
    </div>
  );
}
