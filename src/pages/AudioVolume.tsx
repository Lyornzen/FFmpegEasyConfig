import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, Slider, message, Alert } from 'antd';
import { DashboardOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';

const { Option } = Select;
function formatFileSize(b: number): string { if (b===0) return '—'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }
function codecToExt(c: string): string { const m: Record<string,string>={aac:'m4a',libmp3lame:'mp3',flac:'flac',libopus:'opus',pcm_s16le:'wav',copy:''}; return m[c]||c; }
let c=0;

export default function AudioVolume() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [ffmpegOk,setFf]=useState(true);
  const [volume,setVol]=useState(100);
  const [codec,setCodec]=useState('aac');
  const [outputDir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning,progress}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback(async(nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'audio' as const};});setFiles(p=>[...p,...m]);},[files]);
  const handleStart=useCallback(()=>{if(!ffmpegOk){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!outputDir){message.warning('请选择输出目录');return;}const f=files[0];const sep=outputDir.includes('\\')?'\\':'/';const out=`${outputDir}${outputDir.endsWith(sep)?'':sep}${f.name.replace(/\.[^.]+$/,'')}_vol${volume}.${codecToExt(codec)}`;const tid=`task-${Date.now()}`;addTask({key:tid,name:`音量 ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});const db=20*Math.log10(volume/100);run({taskId:tid,inputPath:f.path,outputPath:out,audioCodec:codec,extraArgs:['-af',`volume=${volume/100}`]});},[files,outputDir,codec,volume,run,ffmpegOk,addTask]);
  const cmd=files.length>0&&outputDir?`ffmpeg -y -i "${files[0].path}" -af "volume=${volume/100}" -c:a ${codec} "${outputDir}/${files[0].name.replace(/\.[^.]+$/,'')}_vol${volume}.${codecToExt(codec)}"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ffmpegOk&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择音频"><FileDropZone onFilesAdded={handleFiles} accept=".mp3,.wav,.flac,.aac,.ogg,.wma,.m4a" hint="支持 MP3, WAV, FLAC, AAC 等音频格式"/><FileInfoTable files={files} onRemove={k=>setFiles(p=>p.filter(f=>f.key!==k))}/></Card>
    <Card title="音量调节">
      <div style={{textAlign:'center',marginBottom:8}}><span style={{fontSize:32,fontWeight:700,color:'#1677ff'}}>{volume}%</span><span style={{fontSize:14,color:'#6b7280',marginLeft:8}}>{(20*Math.log10(volume/100)).toFixed(1)} dB</span></div>
      <Slider min={10} max={300} value={volume} onChange={setVol} marks={{10:'10%',50:'50%',100:'100%',200:'200%',300:'300%'}}/>
    </Card>
    <Card title="输出设置"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="aac">AAC</Option><Option value="libmp3lame">MP3</Option><Option value="flac">FLAC</Option></Select></div>
      <div style={{display:'flex',alignItems:'flex-end'}}><Input placeholder="选择输出目录..." value={outputDir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></div>
    </div></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`音量: ${volume}%`:'请先添加文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0}>调节音量</Button></div></Card>
  </div>);
}
