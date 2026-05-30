import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, message, Alert } from 'antd';
import { ImportOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;
function formatFileSize(b: number): string { if (b===0) return '—'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }
function codecToExt(c: string): string { const m: Record<string,string>={aac:'m4a',libmp3lame:'mp3',flac:'flac',pcm_s16le:'wav'}; return m[c]||c; }
let c=0;

export default function AudioExtract() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [codec,setCodec]=useState('aac');
  const [bitrate,setBr]=useState('192k');
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback(async(nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'video' as const};});setFiles(p=>[...p,...m]);},[files]);
  const ext=codecToExt(codec);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!dir){message.warning('请选择输出目录');return;}const f=files[0];const out=joinPath(dir,`${f.name.replace(/\.[^.]+$/,'')}_audio.${ext}`);const tid=`task-${Date.now()}`;addTask({key:tid,name:`提取音频 ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});run({taskId:tid,inputPath:f.path,outputPath:out,audioCodec:codec,extraArgs:['-vn',...(bitrate?['-b:a',bitrate]:[])]});},[files,dir,codec,bitrate,ext,run,ff,addTask]);
  const cmd=files.length>0&&dir?`ffmpeg -y -i "${files[0].path}" -vn -c:a ${codec}${bitrate?` -b:a ${bitrate}`:''} "${joinPath(dir,`${files[0].name.replace(/\.[^.]+$/,'')}_audio.${ext}`)}"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择视频"><FileDropZone onFilesAdded={handleFiles} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="从视频中提取音频轨道"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="提取参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>音频编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="aac">AAC</Option><Option value="libmp3lame">MP3</Option><Option value="flac">FLAC (无损)</Option><Option value="pcm_s16le">WAV (无损)</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>比特率</label><Select value={bitrate} onChange={setBr} style={{width:'100%'}}><Option value="">自动</Option><Option value="320k">320k</Option><Option value="256k">256k</Option><Option value="192k">192k</Option><Option value="128k">128k</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?'就绪':'请先选择视频文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>提取音频</Button></div></Card>
  </div>);
}
