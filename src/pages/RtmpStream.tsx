import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, InputNumber, message, Alert } from 'antd';
import { SendOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { formatFileSize } from '../shared/utils';

const { Option } = Select;
let c=0;

export default function RtmpStream() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [url,setUrl]=useState('rtmp://server/live/stream');
  const [codec,setCodec]=useState('libx264');
  const [bitrate,setBr]=useState('2500k');
  const [preset,setPreset]=useState('veryfast');
  const [bufSize,setBs]=useState('5000k');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:()=>{message.success('推流结束');},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback((nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'video' as const};});setFiles(p=>[...p,...m]);},[]);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!url){message.warning('请输入 RTMP 地址');return;}const f=files[0];const tid=`task-${Date.now()}`;addTask({key:tid,name:`推流 ${f.name}`,inputFile:f.path,outputFile:url,progress:0,speed:'—',remaining:'—',status:'processing'});
    run({taskId:tid,inputPath:f.path,outputPath:url,videoCodec:codec,audioCodec:'aac',bitrate,preset,extraArgs:['-f','flv','-bufsize',bufSize]});},[files,url,codec,bitrate,preset,bufSize,run,ff,addTask]);
  const cmd=files.length>0&&url?`ffmpeg -re -i "${files[0].path}" -c:v ${codec} -b:v ${bitrate} -preset ${preset} -c:a aac -bufsize ${bufSize} -f flv "${url}"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择视频源"><FileDropZone onFilesAdded={handleFiles} accept=".mp4,.avi,.mkv,.mov,.flv" hint="选择要推流的视频文件"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="推流设置"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div style={{gridColumn:'1/-1'}}><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>RTMP 服务器地址</label><Input value={url} onChange={e=>setUrl(e.target.value)} placeholder="rtmp://server/live/stream"/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option><Option value="h264_nvenc">NVENC H.264</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>视频比特率</label><Select value={bitrate} onChange={setBr} style={{width:'100%'}}><Option value="8000k">8 Mbps</Option><Option value="5000k">5 Mbps</Option><Option value="2500k">2.5 Mbps</Option><Option value="1000k">1 Mbps</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>Preset</label><Select value={preset} onChange={setPreset} style={{width:'100%'}}><Option value="ultrafast">ultrafast</Option><Option value="veryfast">veryfast</Option><Option value="fast">fast</Option><Option value="medium">medium</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>缓冲区大小</label><Select value={bufSize} onChange={setBs} style={{width:'100%'}}><Option value="10000k">10M</Option><Option value="5000k">5M</Option><Option value="2500k">2.5M</Option></Select></div>
    </div></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`推流到 ${url}`:'请添加视频文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>开始推流</Button></div></Card>
  </div>);
}
