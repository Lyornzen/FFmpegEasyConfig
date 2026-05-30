import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Space, Select, Input, InputNumber, Slider, message, Alert, Radio, Tag, Empty, List } from 'antd';
import { CameraOutlined, CaretRightOutlined, ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';

const { Option } = Select;

function formatFileSize(bytes: number): string { if (bytes === 0) return '—'; const u = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }
function timeToSec(t: string): number { const p = t.split(':').map(Number); return (p[0]||0)*3600 + (p[1]||0)*60 + (p[2]||0); }
function secToTime(s: number): string { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
function parseDuration(dur: string): number { return dur === '—' ? 300 : timeToSec(dur); }

interface FrameShot { time: string; sec: number; }

let fileIdCounter = 0;

export default function VideoExtractFrame() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState(true);
  const [mode, setMode] = useState<'time' | 'interval' | 'keyframe'>('time');
  const [extractTime, setExtractTime] = useState('00:00:01');
  const [intervalSec, setIntervalSec] = useState(5);
  const [imageFormat, setImageFormat] = useState('jpg');
  const [quality, setQuality] = useState(2);
  const [resolution, setResolution] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [frameShots, setFrameShots] = useState<FrameShot[]>([]);
  const { addTask, updateTask } = useTaskContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalDuration = useMemo(() => selectedFile ? parseDuration(selectedFile.duration) : 300, [selectedFile]);

  // ── S key listener: capture current video time ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        // Don't capture if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        const vid = videoRef.current;
        if (vid && selectedFile) {
          const t = vid.currentTime;
          const label = secToTime(t);
          setFrameShots((prev) => {
            // Avoid duplicates within 0.5s
            if (prev.some((s) => Math.abs(s.sec - t) < 0.5)) return prev;
            return [...prev, { time: label, sec: t }];
          });
          message.success(`已捕获: ${label}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedFile]);

  // ── Remove a frame shot ──
  const removeShot = (idx: number) => setFrameShots((prev) => prev.filter((_, i) => i !== idx));

  // ── ffprobe ──
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
    const times = mode === 'time' ? [extractTime] : [];
    if (frameShots.length > 0) {
      // Use captured frame shots — run one task per shot or batch them
      frameShots.forEach((shot) => {
        const file = files[0];
        const sep = outputDir ? (outputDir.includes('\\') ? '\\' : '/') : '';
        const base = outputDir ? `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${file.name.replace(/\.[^.]+$/, '')}` : file.name.replace(/\.[^.]+$/, '');
        const out = `${base}_${shot.time.replace(/:/g, '')}.${imageFormat}`;
        const taskId = `task-${Date.now()}-${shot.sec}`;
        addTask({ key: taskId, name: `截图 ${file.name} @ ${shot.time}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
        const extraArgs = ['-ss', shot.time, '-frames:v', '1', '-q:v', String(quality)];
        if (resolution) extraArgs.push('-s', resolution.replace(':', 'x'));
        run({ taskId, inputPath: file.path, outputPath: out, extraArgs });
      });
    } else if (mode === 'time') {
      const file = files[0];
      if (!outputDir) { message.warning('请选择输出目录'); return; }
      const sep = outputDir.includes('\\') ? '\\' : '/';
      const out = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${file.name.replace(/\.[^.]+$/, '')}_${extractTime.replace(/:/g, '')}.${imageFormat}`;
      const taskId = `task-${Date.now()}`;
      addTask({ key: taskId, name: `提取帧 ${file.name}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
      const extraArgs = ['-ss', extractTime, '-frames:v', '1', '-q:v', String(quality)];
      if (resolution) extraArgs.push('-s', resolution.replace(':', 'x'));
      run({ taskId, inputPath: file.path, outputPath: out, extraArgs });
    } else {
      const file = files[0];
      if (!outputDir) { message.warning('请选择输出目录'); return; }
      const sep = outputDir.includes('\\') ? '\\' : '/';
      const base = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${file.name.replace(/\.[^.]+$/, '')}`;
      const taskId = `task-${Date.now()}`;
      const extraArgs: string[] = [];
      if (resolution) extraArgs.push('-s', resolution.replace(':', 'x'));

      if (mode === 'interval') {
        const out = `${base}_%04d.${imageFormat}`;
        addTask({ key: taskId, name: `提取帧序列 ${file.name}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
        run({ taskId, inputPath: file.path, outputPath: out, extraArgs: ['-vf', `fps=1/${intervalSec}`, '-q:v', String(quality), ...extraArgs] });
      } else {
        const out = `${base}_keyframe_%04d.${imageFormat}`;
        addTask({ key: taskId, name: `提取关键帧 ${file.name}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });
        run({ taskId, inputPath: file.path, outputPath: out, extraArgs: ['-vf', 'select=eq(pict_type\\,I)', '-vsync', 'vfr', '-q:v', String(quality), ...extraArgs] });
      }
    }
  }, [files, outputDir, imageFormat, quality, mode, extractTime, intervalSec, resolution, frameShots, run, ffmpegOk, addTask]);

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Left: Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!ffmpegOk && <Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined />} showIcon />}

        {/* Top: Video preview player */}
        {selectedFile && (
          <Card title="预览 (按 S 键捕获当前帧)">
            <div style={{ background: '#1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              <video
                ref={videoRef}
                controls
                style={{ width: '100%', display: 'block', maxHeight: 360 }}
                src={(() => {
                  const p = selectedFile.path.replace(/\\/g, '/');
                  return `local-file://${encodeURIComponent(p)}`;
                })()}
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              播放视频时按下 <Tag style={{ fontFamily: 'monospace' }}>S</Tag> 键捕获当前画面时间到右侧帧列表
            </div>
          </Card>
        )}

        <Card title="选择视频">
          <FileDropZone onFilesAdded={handleFilesAdded} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="支持 MP4, AVI, MKV, MOV 等视频格式" />
          <FileInfoTable files={files} onRemove={(k) => { setFiles((p) => p.filter((f) => f.key !== k)); if (selectedFile?.key === k) { setSelectedFile(null); setFrameShots([]); } }} />
        </Card>

        <Card title="提取模式">
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} style={{ marginBottom: 16 }}>
            <Radio.Button value="time">指定时间点</Radio.Button>
            <Radio.Button value="interval">等间隔提取</Radio.Button>
            <Radio.Button value="keyframe">所有关键帧</Radio.Button>
          </Radio.Group>
          {mode === 'time' && (
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>提取时间点</label><Input value={extractTime} onChange={(e) => setExtractTime(e.target.value)} style={{ width: 200 }} /></div>
          )}
          {mode === 'interval' && (
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>间隔秒数</label><InputNumber min={1} max={3600} value={intervalSec} onChange={(v) => setIntervalSec(v ?? 5)} style={{ width: 200 }} /></div>
          )}
          {mode === 'keyframe' && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>提取视频中所有的 I 帧（关键帧），无需重新编码</div>}
        </Card>

        <Card title="输出参数">
          <Space size={24} wrap>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>图片格式</label><Select value={imageFormat} onChange={setImageFormat} style={{ width: 100 }}><Option value="jpg">JPG</Option><Option value="png">PNG</Option></Select></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>质量 (1-5)</label><InputNumber min={1} max={5} value={quality} onChange={(v) => setQuality(v ?? 2)} style={{ width: 80 }} /></div>
            <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>分辨率</label><Select value={resolution} onChange={setResolution} style={{ width: 120 }}><Option value="">原始</Option><Option value="1920:1080">1080p</Option><Option value="1280:720">720p</Option></Select></div>
          </Space>
        </Card>

        <Card title="输出设置">
          <Input placeholder="选择输出目录..." value={outputDir} onChange={(e) => setOutputDir(e.target.value)} addonAfter={<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={async () => { const d = await window.electronAPI?.file?.openDirDialog(); if (d) setOutputDir(d); }}>浏览</span>} />
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              {frameShots.length > 0 ? `${frameShots.length} 个截图待提取` : mode === 'time' ? '1 张图片' : mode === 'interval' ? `约 ${Math.ceil(totalDuration / intervalSec)} 张` : '关键帧'}
            </span>
            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart} loading={isRunning} disabled={files.length === 0}>开始提取</Button>
          </div>
        </Card>
      </div>

      {/* Right: Frame shot list */}
      <Card title={`帧截图列表 (${frameShots.length})`} style={{ width: 420, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 0, maxHeight: 'calc(100vh - 140px)', overflow: 'auto' }}>
        {frameShots.length === 0 ? (
          <Empty description="播放视频时按 S 键捕获帧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={frameShots}
            renderItem={(shot, idx) => (
              <List.Item
                actions={[<Button key="del" type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeShot(idx)} />]}
                style={{ cursor: 'pointer' }}
                onClick={() => setExtractTime(shot.time)}
              >
                <Tag color="blue" style={{ fontFamily: 'monospace' }}>#{idx + 1}</Tag>
                <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{shot.time}</span>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
