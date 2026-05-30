import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, Button, Select, Input, InputNumber, Slider, message, Alert } from 'antd';
import { FileGifOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import PreviewPanel from '../shared/PreviewPanel';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { formatFileSize, timeToSec, secToTime, parseDuration } from '../shared/utils';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;
let c=0;

export default function VideoToGif() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [sf,setSf]=useState<MediaFile|null>(null);
  const [ff,setFf]=useState(true);
  const [start,setStart]=useState('00:00:00');
  const [dur,setDurT]=useState('00:00:05');
  const [fps,setFps]=useState(10);
  const [width,setWidth]=useState(480);
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  const total=useMemo(()=>sf?parseDuration(sf.duration):300,[sf]);
  const ss=timeToSec(start);const dd=Math.min(timeToSec(dur),total-ss);
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback(async(nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'video' as const};});setFiles(p=>[...p,...m]);if(!sf&&m.length>0)setSf(m[0]);for(const mf of m){const info=await window.electronAPI?.file?.getInfo(mf.path);if(info){setFiles(p=>p.map(f=>f.key===mf.key?{...f,duration:info.duration}:f));setSf(p=>p?.key===mf.key?{...p!,duration:info.duration}:p);}}},[sf]);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!dir){message.warning('请选择输出目录');return;}const f=files[0];const out=joinPath(dir,`${f.name.replace(/\.[^.]+$/,'')}.gif`);const tid=`task-${Date.now()}`;addTask({key:tid,name:`GIF ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    const vf=`fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
    run({taskId:tid,inputPath:f.path,outputPath:out,extraArgs:['-ss',start,'-t',secToTime(dd),'-vf',vf]});},[files,dir,start,dur,dd,fps,width,run,ff,addTask]);
  const vf=`fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
  const cmd=files.length>0&&dir?`ffmpeg -y -ss ${start} -t ${secToTime(dd)} -i "${files[0].path}" -vf "${vf}" "${dir}/${files[0].name.replace(/\.[^.]+$/,'')}.gif"`:'';
  return (<div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择视频"><FileDropZone onFilesAdded={handleFiles} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="选择要转换为 GIF 的视频文件"/><FileInfoTable files={files} onRemove={k=>{setFiles(p=>p.filter(f=>f.key!==k));if(sf?.key===k)setSf(files.length>1?files[0]:null);}} onPreview={setSf}/></Card>
    {sf&&sf.duration!=='—'&&(<Card title="时间轴"><div style={{padding:'0 8px'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12,color:'#6b7280'}}><span>00:00:00</span><span style={{color:'#1677ff',fontWeight:500}}>{secToTime(ss)} – {secToTime(ss+dd)}</span><span>{sf.duration}</span></div><Slider range min={0} max={total} step={1} value={[ss,ss+dd]} onChange={v=>{setStart(secToTime(v[0]));setDurT(secToTime(v[1]-v[0]));}} tooltip={{formatter:v=>secToTime(v||0)}}/></div></Card>)}
    <Card title="GIF 参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>开始时间</label><Input value={start} onChange={e=>setStart(e.target.value)}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>持续时长</label><Input value={dur} onChange={e=>setDurT(e.target.value)}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>帧率</label><Select value={fps} onChange={setFps}><Option value={30}>30</Option><Option value={15}>15</Option><Option value={10}>10</Option><Option value={5}>5</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>宽度 (px)</label><InputNumber min={120} max={1920} step={10} value={width} onChange={v=>setWidth(v??480)} style={{width:'100%'}}/></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`${secToTime(dd)} → GIF ${width}px @${fps}fps`:'请先添加视频'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>生成 GIF</Button></div></Card>
    </div><PreviewPanel file={sf}/></div>);
}
