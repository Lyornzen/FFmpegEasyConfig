import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, message, Alert, Tag, Progress } from 'antd';
import { AppstoreOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { formatFileSize } from '../shared/utils';
import { joinPath } from '../shared/pathUtils';

const { Option } = Select;
let c=0;

export default function BatchProcess() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ff,setFf]=useState(true);
  const [codec,setCodec]=useState('libx264');
  const [crf,setCrf]=useState(23);
  const [preset,setPreset]=useState('medium');
  const [fmt,setFmt]=useState('mp4');
  const [dir,setDir]=useState('');
  const [processing,setProcessing]=useState<string[]>([]);
  const [done,setDone]=useState(0);
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run}=useFFmpeg({onComplete:()=>{setDone(p=>p+1);},onError:()=>{setDone(p=>p+1);}});
  const handleFiles=useCallback((nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'video' as const};});setFiles(p=>[...p,...m]);},[]);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!dir){message.warning('请选择输出目录');return;}setDone(0);setProcessing(files.map(f=>f.name));
    files.forEach(f=>{const out=joinPath(dir,`${f.name.replace(/\.[^.]+$/,'')}_batch.${fmt}`);const tid=`task-${Date.now()}-${f.key}`;addTask({key:tid,name:`批量 ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
      run({taskId:tid,inputPath:f.path,outputPath:out,videoCodec:codec,audioCodec:'aac',crf,preset});});},[files,dir,codec,crf,preset,fmt,run,ff,addTask]);
  const pct=files.length>0?Math.round(done/files.length*100):0;
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="批量文件"><FileDropZone onFilesAdded={handleFiles} accept=".mp4,.avi,.mkv,.mov,.wmv,.flv,.webm" hint="拖入多个文件批量处理"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    {files.length>0&&done>0&&<Card title="进度"><Progress percent={pct} format={()=>`${done}/${files.length}`}/></Card>}
    <Card title="转换参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>CRF</label><Input value={crf} onChange={e=>setCrf(Number(e.target.value)||23)}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>Preset</label><Select value={preset} onChange={setPreset} style={{width:'100%'}}><Option value="ultrafast">ultrafast</Option><Option value="veryfast">veryfast</Option><Option value="medium">medium</Option><Option value="slow">slow</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>输出格式</label><Select value={fmt} onChange={setFmt} style={{width:'100%'}}><Option value="mp4">MP4</Option><Option value="mkv">MKV</Option><Option value="mov">MOV</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`${files.length} 个文件待处理`:'请添加文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} disabled={files.length===0||done>0&&done<files.length}>开始批处理</Button></div></Card>
  </div>);
}
