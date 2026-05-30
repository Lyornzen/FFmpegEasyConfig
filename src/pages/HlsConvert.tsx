import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, InputNumber, message, Alert } from 'antd';
import { SwapOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { formatFileSize } from '../shared/utils';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;
let c=0;

export default function HlsConvert() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [segTime,setSeg]=useState(10);
  const [codec,setCodec]=useState('libx264');
  const [bitrate,setBr]=useState('');
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback((nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'video' as const};});setFiles(p=>[...p,...m]);},[]);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!dir){message.warning('请选择输出目录');return;}const f=files[0];const out=joinPath(dir,`${f.name.replace(/\.[^.]+$/,'')}.m3u8`);const tid=`task-${Date.now()}`;addTask({key:tid,name:`HLS ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    const ea=['-hls_time',String(segTime),'-hls_list_size','0','-hls_segment_filename',joinPath(dir,`${f.name.replace(/\.[^.]+$/,'')}_%03d.ts`)];
    if(bitrate)ea.push('-b:v',bitrate);
    run({taskId:tid,inputPath:f.path,outputPath:out,videoCodec:codec,audioCodec:'aac',extraArgs:ea});},[files,dir,segTime,codec,bitrate,run,ff,addTask]);
  const cmd=files.length>0&&dir?`ffmpeg -y -i "${files[0].path}" -c:v ${codec} -c:a aac${bitrate?` -b:v ${bitrate}`:''} -hls_time ${segTime} -hls_list_size 0 -hls_segment_filename "${dir}/${files[0].name.replace(/\.[^.]+$/,'')}_%03d.ts" "${dir}/${files[0].name.replace(/\.[^.]+$/,'')}.m3u8"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择视频"><FileDropZone onFilesAdded={handleFiles} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="选择要转换为 HLS 流的视频"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="HLS 参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>分片时长 (秒)</label><InputNumber min={2} max={60} value={segTime} onChange={v=>setSeg(v??10)} style={{width:'100%'}}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>比特率</label><Select value={bitrate} onChange={setBr} style={{width:'100%'}}><Option value="">自动</Option><Option value="8M">8 Mbps</Option><Option value="5M">5 Mbps</Option><Option value="2M">2 Mbps</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`HLS 分片 ${segTime}s`:'请先添加视频'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>开始转换</Button></div></Card>
  </div>);
}
