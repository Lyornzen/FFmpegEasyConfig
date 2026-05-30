import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, Slider, message, Alert } from 'antd';
import { BgColorsOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;
function formatFileSize(b: number): string { if (b===0) return '—'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }
function codecToExt(c: string): string { const m: Record<string,string>={aac:'m4a',libmp3lame:'mp3'}; return m[c]||'m4a'; }
let c=0;

export default function AudioBackground() {
  const [mainFiles,setMain]=useState<MediaFile[]>([]);
  const [bgFiles,setBg]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [bgVolume,setVol]=useState(20);
  const [mixMode,setMode]=useState<'mix'|'replace'>('mix');
  const [codec,setCodec]=useState('aac');
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleMainFiles=useCallback((nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'audio' as const};});setMain(p=>[...p,...m]);},[mainFiles]);
  const handleBgFiles=useCallback((nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'audio' as const};});setBg(p=>[...p,...m]);},[bgFiles]);
  const ext=codecToExt(codec);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(mainFiles.length===0||bgFiles.length===0){message.warning('请添加主音频和背景音乐');return;}if(!dir){message.warning('请选择输出目录');return;}const main=mainFiles[0];const bg=bgFiles[0];const out=joinPath(dir,`${main.name.replace(/\.[^.]+$/,'')}_bgm.${ext}`);const tid=`task-${Date.now()}`;addTask({key:tid,name:`添加背景音乐 ${main.name}`,inputFile:main.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    const filter=mixMode==='mix'?`[1:a]volume=${bgVolume/100}[bg];[0:a][bg]amix=inputs=2:duration=first`:`[0:a][1:a]amix=inputs=2:duration=first:weights=0 ${bgVolume/100}`;
    run({taskId:tid,inputPath:main.path,inputPaths:[main.path,bg.path],outputPath:out,audioCodec:codec,extraArgs:['-filter_complex',filter]});},[mainFiles,bgFiles,dir,codec,bgVolume,mixMode,ext,run,ff,addTask]);
  const cmd=mainFiles.length>0&&bgFiles.length>0&&dir?`ffmpeg -y -i "${mainFiles[0].path}" -i "${bgFiles[0].path}" -filter_complex "${mixMode==='mix'?`[1:a]volume=${bgVolume/100}[bg];[0:a][bg]amix=inputs=2:duration=first`:`[0:a][1:a]amix=inputs=2:duration=first:weights=0 ${bgVolume/100}`}" -c:a ${codec} "${joinPath(dir,`${mainFiles[0].name.replace(/\.[^.]+$/,'')}_bgm.${ext}`)}"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="主音频"><FileDropZone onFilesAdded={handleMainFiles} accept=".mp3,.wav,.flac,.aac,.ogg,.wma,.m4a" hint="选择主音频文件"/><FileInfoTable files={mainFiles} onRemove={k=>setMain(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="背景音乐"><FileDropZone onFilesAdded={handleBgFiles} accept=".mp3,.wav,.flac,.aac,.ogg,.wma,.m4a" hint="选择背景音乐文件"/><FileInfoTable files={bgFiles} onRemove={k=>setBg(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="混音参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>背景音量: {bgVolume}%</label><Slider min={1} max={100} value={bgVolume} onChange={setVol}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>模式</label><Select value={mixMode} onChange={setMode} style={{width:'100%'}}><Option value="mix">混合叠加</Option><Option value="replace">背景替换</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>输出编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="aac">AAC</Option><Option value="libmp3lame">MP3</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{mainFiles.length>0&&bgFiles.length>0?`主音频 + 背景 (${bgVolume}%)`:'请添加两个音频文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={mainFiles.length===0||bgFiles.length===0}>开始混音</Button></div></Card>
  </div>);
}
