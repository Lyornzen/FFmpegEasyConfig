import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, InputNumber, Slider, message, Alert } from 'antd';
import { PlaySquareOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { formatFileSize } from '../shared/utils';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;
let c=0;

export default function ImageToVideo() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [fps,setFps]=useState(30);
  const [codec,setCodec]=useState('libx264');
  const [crf,setCrf]=useState(23);
  const [resolution,setRes]=useState('');
  const [duration,setDur]=useState(5);
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback((nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'image' as const};});setFiles(p=>[...p,...m]);},[]);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加图片');return;}if(!dir){message.warning('请选择输出目录');return;}const out=joinPath(dir,'slideshow.mp4');const tid=`task-${Date.now()}`;addTask({key:tid,name:`图片转视频 (${files.length} 张)`,inputFile:files[0].path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    // Build image sequence: use first image as pattern base, ffmpeg glob or concat
    // For simplicity, use -pattern_type glob if all images in same dir
    const firstDir=files[0].path.replace(/[^\\/]+$/,'');
    const ext=files[0].name.split('.').pop();
    const ea=['-framerate',String(fps)];
    if(resolution)ea.push('-s',resolution.replace(':','x'));
    run({taskId:tid,inputPath:`${firstDir}*.${ext}`,outputPath:out,videoCodec:codec,crf,extraArgs:ea});},[files,dir,fps,codec,crf,resolution,run,ff,addTask]);
  const cmd=files.length>0?`ffmpeg -y -framerate ${fps} -pattern_type glob -i "*.${files[0].name.split('.').pop()}" -c:v ${codec} -crf ${crf}${resolution?` -s ${resolution.replace(':','x')}`:''} "${dir||'{目录}'}/slideshow.mp4"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择图片"><FileDropZone onFilesAdded={handleFiles} accept=".png,.jpg,.jpeg,.bmp,.webp" hint="支持 PNG, JPG, BMP, WebP — 图片按文件名排序合成为视频"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="视频参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>帧率 FPS</label><Select value={fps} onChange={setFps} style={{width:'100%'}}><Option value={60}>60</Option><Option value={30}>30</Option><Option value={25}>25</Option><Option value={24}>24</Option><Option value={15}>15</Option><Option value={10}>10</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>每张图片持续 (秒)</label><InputNumber min={1} max={30} value={duration} onChange={v=>{setDur(v??5);setFps(Math.round(files.length/(v||5)));}} style={{width:'100%'}}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>CRF 质量</label><Slider min={0} max={51} value={crf} onChange={setCrf} marks={{0:'无损',23:'默认',51:'最低'}}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>分辨率</label><Select value={resolution} onChange={setRes} style={{width:'100%'}}><Option value="">原始</Option><Option value="1920:1080">1080p</Option><Option value="1280:720">720p</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`${files.length} 张图片`:'请添加图片'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>生成视频</Button></div></Card>
  </div>);
}
