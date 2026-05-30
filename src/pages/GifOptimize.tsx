import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, InputNumber, Slider, message, Alert } from 'antd';
import { ThunderboltOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { formatFileSize } from '../shared/utils';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;
let c=0;

export default function GifOptimize() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [fps,setFps]=useState(10);
  const [width,setWidth]=useState(480);
  const [colors,setColors]=useState(128);
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback((nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'image' as const};});setFiles(p=>[...p,...m]);},[]);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加 GIF 文件');return;}if(!dir){message.warning('请选择输出目录');return;}const f=files[0];const out=joinPath(dir,`${f.name.replace(/\.[^.]+$/,'')}_opt.gif`);const tid=`task-${Date.now()}`;addTask({key:tid,name:`优化 GIF ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    const vf=`fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${colors}[p];[s1][p]paletteuse`;
    run({taskId:tid,inputPath:f.path,outputPath:out,extraArgs:['-vf',vf]});},[files,dir,fps,width,colors,run,ff,addTask]);
  const vf=`fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${colors}[p];[s1][p]paletteuse`;
  const cmd=files.length>0&&dir?`ffmpeg -y -i "${files[0].path}" -vf "${vf}" "${dir}/${files[0].name.replace(/\.[^.]+$/,'')}_opt.gif"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择 GIF"><FileDropZone onFilesAdded={handleFiles} accept=".gif" hint="选择要优化的 GIF 文件"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="优化参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>帧率</label><Select value={fps} onChange={setFps} style={{width:'100%'}}><Option value={30}>30</Option><Option value={15}>15</Option><Option value={10}>10</Option><Option value={5}>5</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>宽度 (px)</label><InputNumber min={120} max={1920} value={width} onChange={v=>setWidth(v??480)} style={{width:'100%'}}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>最大颜色数</label><Select value={colors} onChange={setColors} style={{width:'100%'}}><Option value={256}>256</Option><Option value={128}>128</Option><Option value={64}>64</Option><Option value={32}>32</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`优化: ${width}px @${fps}fps ${colors}色`:'请添加 GIF'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>优化 GIF</Button></div></Card>
  </div>);
}
