import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, InputNumber, message, Alert } from 'antd';
import { LaptopOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;

export default function ScreenStream() {
  const [ff,setFf]=useState(true);
  const [codec,setCodec]=useState('libx264');
  const [crf,setCrf]=useState(23);
  const [preset,setPreset]=useState('ultrafast');
  const [fps,setFps]=useState(30);
  const [resolution,setRes]=useState('1920:1080');
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const os=typeof navigator!=='undefined'&&navigator.platform?.toLowerCase().includes('win')?'windows':typeof navigator!=='undefined'&&navigator.platform?.toLowerCase().includes('mac')?'mac':'linux';
  const device=os==='windows'?'gdigrab':os==='mac'?'avfoundation':'x11grab';
  const input=os==='windows'?'desktop':os==='mac'?'1':'0.0';
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(!dir){message.warning('请选择输出目录');return;}const out=joinPath(dir,`recording_${Date.now()}.mp4`);const tid=`task-${Date.now()}`;addTask({key:tid,name:'录屏',inputFile:`${device}://${input}`,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    run({taskId:tid,inputPath:`${device}:${input}`,outputPath:out,videoCodec:codec,crf,preset,fps,extraArgs:['-f',device,'-framerate',String(fps),'-video_size',resolution.replace(':','x')]});},[dir,codec,crf,preset,fps,resolution,device,input,run,ff,addTask]);
  const cmd=`ffmpeg -y -f ${device} -framerate ${fps} -video_size ${resolution.replace(':','x')} -i ${input} -c:v ${codec} -crf ${crf} -preset ${preset} "${dir||'{目录}'}/recording.mp4"`;
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title={`录屏 (${os==='windows'?'Windows GDI':os==='mac'?'macOS AVFoundation':'Linux X11'})`}>
      <Alert type="info" message={`使用 ${device} 设备捕获屏幕。需要 FFmpeg 编译时包含对应模块。`} style={{marginBottom:16}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>分辨率</label><Select value={resolution} onChange={setRes} style={{width:'100%'}}><Option value="3840:2160">4K</Option><Option value="1920:1080">1080p</Option><Option value="1280:720">720p</Option></Select></div>
        <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>帧率</label><Select value={fps} onChange={setFps} style={{width:'100%'}}><Option value={60}>60</Option><Option value={30}>30</Option><Option value={15}>15</Option></Select></div>
        <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option></Select></div>
        <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>CRF</label><InputNumber min={0} max={51} value={crf} onChange={v=>setCrf(v??23)} style={{width:'100%'}}/></div>
        <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>Preset</label><Select value={preset} onChange={setPreset} style={{width:'100%'}}><Option value="ultrafast">ultrafast</Option><Option value="veryfast">veryfast</Option><Option value="fast">fast</Option></Select></div>
      </div>
    </Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    <Card title="命令预览"><CommandPreview command={cmd}/></Card>
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>录制屏幕 · {resolution} @{fps}fps</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning}>开始录制</Button></div></Card>
  </div>);
}
