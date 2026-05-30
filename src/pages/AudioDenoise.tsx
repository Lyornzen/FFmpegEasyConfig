import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, Slider, message, Alert } from 'antd';
import { ControlOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';

const { Option } = Select;
function formatFileSize(b: number): string { if (b===0) return '—'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }
function codecToExt(c: string): string { const m: Record<string,string>={aac:'m4a',libmp3lame:'mp3',flac:'flac',libopus:'opus'}; return m[c]||'m4a'; }
let c=0;

export default function AudioDenoise() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [profile,setProfile]=useState('light');
  const [strength,setStr]=useState(0.15);
  const [codec,setCodec]=useState('aac');
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback(async(nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'audio' as const};});setFiles(p=>[...p,...m]);},[files]);
  const buildFilter=():string=>{
    if(profile==='light')return `afftdn=nr=${strength.toFixed(2)}`;
    if(profile==='medium')return `afftdn=nr=${(strength*1.5).toFixed(2)}:tn=1`;
    return `afftdn=nr=${(strength*2).toFixed(2)}:tn=1:om=o`;
  };
  const ext=codecToExt(codec);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!dir){message.warning('请选择输出目录');return;}const f=files[0];const sep=dir.includes('\\')?'\\':'/';const out=`${dir}${dir.endsWith(sep)?'':sep}${f.name.replace(/\.[^.]+$/,'')}_denoised.${ext}`;const tid=`task-${Date.now()}`;addTask({key:tid,name:`降噪 ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});run({taskId:tid,inputPath:f.path,outputPath:out,audioCodec:codec,extraArgs:['-af',buildFilter()]});},[files,dir,codec,profile,strength,ext,run,ff,addTask]);
  const cmd=files.length>0&&dir?`ffmpeg -y -i "${files[0].path}" -af "${buildFilter()}" -c:a ${codec} "${dir}/${files[0].name.replace(/\.[^.]+$/,'')}_denoised.${ext}"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择音频"><FileDropZone onFilesAdded={handleFiles} accept=".mp3,.wav,.flac,.aac,.ogg,.wma,.m4a" hint="支持 MP3, WAV, FLAC, AAC 等音频格式"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="降噪参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>降噪强度: {(strength*100).toFixed(0)}%</label><Slider min={0.01} max={0.5} step={0.01} value={strength} onChange={setStr} marks={{0.05:'轻',0.15:'中',0.35:'强'}}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>降噪配置</label><Select value={profile} onChange={setProfile} style={{width:'100%'}}><Option value="light">轻度 (背景白噪声)</Option><Option value="medium">中度 (环境噪音)</Option><Option value="heavy">重度 (强噪音抑制)</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>输出编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="aac">AAC</Option><Option value="libmp3lame">MP3</Option><Option value="flac">FLAC</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`降噪: ${profile==='light'?'轻度':profile==='medium'?'中度':'重度'}`:'请先添加文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>开始降噪</Button></div></Card>
  </div>);
}
