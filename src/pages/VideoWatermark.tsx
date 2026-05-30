import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Select, Input, InputNumber, Slider, message, Alert, Radio, ColorPicker } from 'antd';
import { CopyrightOutlined, CaretRightOutlined, ExclamationCircleOutlined, PictureOutlined, FontSizeOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;

function formatFileSize(bytes: number): string { if (bytes === 0) return '—'; const u = ['B','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }

// Positions: drawtext uses W/H for video, text_w/text_h for text.
// overlay uses main_w/main_h for video, overlay_w/overlay_h for overlay.
const textPositions = [
  { label: '左上', x: '10', y: '10' },
  { label: '右上', x: 'W-tw-10', y: '10' },
  { label: '居中', x: '(W-tw)/2', y: '(H-th)/2' },
  { label: '左下', x: '10', y: 'H-th-10' },
  { label: '右下', x: 'W-tw-10', y: 'H-th-10' },
];
const imagePositions = [
  { label: '左上', x: '10', y: '10' },
  { label: '右上', x: 'main_w-overlay_w-10', y: '10' },
  { label: '居中', x: '(main_w-overlay_w)/2', y: '(main_h-overlay_h)/2' },
  { label: '左下', x: '10', y: 'main_h-overlay_h-10' },
  { label: '右下', x: 'main_w-overlay_w-10', y: 'main_h-overlay_h-10' },
];

let fileIdCounter = 0;

export default function VideoWatermark() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [ffmpegOk, setFfmpegOk] = useState(true);

  // Watermark settings
  const [wmType, setWmType] = useState<'text' | 'image'>('text');
  const [wmText, setWmText] = useState('Watermark');
  const [wmFontSize, setWmFontSize] = useState(24);
  const [wmColor, setWmColor] = useState('#ffffff');
  const [wmOpacity, setWmOpacity] = useState(0.7);
  const [wmPosIdx, setWmPosIdx] = useState(4); // default: 右下
  const positions = wmType === 'text' ? textPositions : imagePositions;
  const wmPos = positions[wmPosIdx] || positions[4];
  const [wmImagePath, setWmImagePath] = useState('');

  // Output
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
    if (wmType === 'text') {
      const escaped = wmText.replace(/:/g, '\\:').replace(/'/g, "\\'");
      const colorHex = wmColor.replace('#', '');
      const alpha = Math.round(wmOpacity * 255).toString(16).padStart(2, '0');
      return `drawtext=text='${escaped}':fontsize=${wmFontSize}:fontcolor=${colorHex}${alpha}:x=${wmPos.x}:y=${wmPos.y}`;
    } else {
      if (!wmImagePath) return 'null';
      return `overlay=${wmPos.x}:${wmPos.y}`;
    }
  };

  const handleStart = useCallback(() => {
    if (!ffmpegOk) { message.error('FFmpeg 未安装'); return; }
    if (files.length === 0) { message.warning('请先添加文件'); return; }
    if (wmType === 'image' && !wmImagePath) { message.warning('请选择水印图片'); return; }
    if (!outputDir) { message.warning('请选择输出目录'); return; }
    const file = files[0];
    const sep = outputDir.includes('\\') ? '\\' : '/';
    const out = `${outputDir}${outputDir.endsWith(sep) ? '' : sep}${file.name.replace(/\.[^.]+$/, '')}_watermarked.${outputFormat}`;
    const taskId = `task-${Date.now()}`;
    addTask({ key: taskId, name: `水印 ${file.name}`, inputFile: file.path, outputFile: out, progress: 0, speed: '—', remaining: '—', status: 'processing' });

    const extraArgs: string[] = [];
    if (wmType === 'image') {
      extraArgs.push('-i', wmImagePath, '-filter_complex', `[0:v][1:v]${buildFilter()}`);
    } else {
      extraArgs.push('-vf', buildFilter());
    }

    run({ taskId, inputPath: file.path, inputPaths: wmType === 'image' ? [file.path, wmImagePath] : undefined, outputPath: out, videoCodec, audioCodec: 'aac', extraArgs });
  }, [files, outputDir, outputFormat, videoCodec, wmType, wmText, wmFontSize, wmColor, wmOpacity, wmPos.x, wmPos.y, wmImagePath, run, ffmpegOk, addTask]);

  const command = files.length > 0 && outputDir
    ? (wmType === 'text'
      ? `ffmpeg -y -i "${files[0].path}" -vf "${buildFilter()}" -c:v ${videoCodec} -c:a aac "${joinPath(outputDir, `${files[0].name.replace(/\.[^.]+$/, '')}_watermarked.${outputFormat}`)}"`
      : `ffmpeg -y -i "${files[0].path}" -i "${wmImagePath || '{图片}'}" -filter_complex "[0:v][1:v]${buildFilter()}" -c:v ${videoCodec} -c:a aac "${joinPath(outputDir, `${files[0].name.replace(/\.[^.]+$/, '')}_watermarked.${outputFormat}`)}"`)
    : '';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!ffmpegOk && <Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined />} showIcon />}

        <Card title="选择视频">
          <FileDropZone onFilesAdded={handleFilesAdded} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="支持 MP4, AVI, MKV, MOV 等视频格式" />
          <FileInfoTable files={files} onRemove={(k) => { setFiles((p) => p.filter((f) => f.key !== k)); if (selectedFile?.key === k) setSelectedFile(files.length > 1 ? files[0] : null); }} onPreview={setSelectedFile} />
        </Card>

        <Card title="水印设置">
          <Radio.Group value={wmType} onChange={(e) => setWmType(e.target.value)} style={{ marginBottom: 16 }}>
            <Radio.Button value="text"><FontSizeOutlined /> 文字水印</Radio.Button>
            <Radio.Button value="image"><PictureOutlined /> 图片水印</Radio.Button>
          </Radio.Group>

          {wmType === 'text' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>文字内容</label><Input value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="Watermark" /></div>
              <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>字体大小</label><InputNumber min={8} max={200} value={wmFontSize} onChange={(v) => setWmFontSize(v ?? 24)} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>颜色</label><ColorPicker value={wmColor} onChange={(_, hex) => setWmColor(hex)} showText /></div>
              <div><label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>不透明度: {Math.round(wmOpacity * 100)}%</label><Slider min={0.1} max={1} step={0.05} value={wmOpacity} onChange={setWmOpacity} /></div>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>水印图片</label>
              <Input placeholder="选择水印图片..." value={wmImagePath} onChange={(e) => setWmImagePath(e.target.value)} addonAfter={<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={async () => { const paths = await window.electronAPI?.file?.openDialog({ filters: [{ name: '图片', extensions: ['png','jpg','jpeg','bmp'] }] }); if (paths && paths.length > 0) setWmImagePath(paths[0]); }}>浏览</span>} />
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>位置</label>
            <Radio.Group value={wmPosIdx} onChange={(e) => setWmPosIdx(e.target.value)}>
              {positions.map((p, i) => (
                <Radio.Button key={i} value={i}>{p.label}</Radio.Button>
              ))}
            </Radio.Group>
          </div>
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
            <span style={{ fontSize: 13, color: '#6b7280' }}>{files.length > 0 ? `水印: ${wmType === 'text' ? `"${wmText}"` : wmImagePath || '未选择图片'} · ${wmPos.label}` : '请先添加文件'}</span>
            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart} loading={isRunning} disabled={files.length === 0}>添加水印</Button>
          </div>
        </Card>
      </div>
      <PreviewPanel file={selectedFile} />
    </div>
  );
}
