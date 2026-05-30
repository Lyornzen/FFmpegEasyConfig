import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Select, Input, message, Alert, Tag } from 'antd';
import { MergeCellsOutlined, CaretRightOutlined, ExclamationCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';

const { Option } = Select;
function formatFileSize(b: number): string { if (b===0) return '—'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }
interface AF { key:string; name:string; path:string; fileSize:string; duration:string; codec:string; }
let c=0;

export default function AudioMerge() {
  const [files,setFiles]=useState<AF[]>([]);
  const [ffmpegOk,setFf]=useState(true);
  const [codec,setCodec]=useState('aac');
  const [bitrate,setBr]=useState('192k');
  const [outputDir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning,progress}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback(async(nf:File[])=>{const m:AF[]=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,fileSize:formatFileSize(f.size),duration:'—',codec:'—'};});setFiles(p=>[...p,...m]);for(const mf of m){const info=await window.electronAPI?.file?.getInfo(mf.path);if(info)setFiles(p=>p.map(f=>f.key===mf.key?{...f,duration:info.duration,codec:info.audioCodec}:f));}},[files]);
  const handleRemove=(k:string)=>setFiles(p=>p.filter(f=>f.key!==k));
  const up=(i:number)=>{if(i===0)return;setFiles(p=>{const a=[...p];[a[i-1],a[i]]=[a[i],a[i-1]];return a;});};
  const down=(i:number)=>{if(i===files.length-1)return;setFiles(p=>{const a=[...p];[a[i],a[i+1]]=[a[i+1],a[i]];return a;});};
  const mismatch=files.length>=2&&files.some(f=>f.codec!==files[0].codec);

  const handleStart=useCallback(()=>{if(!ffmpegOk){message.error('FFmpeg 未安装');return;}if(files.length<2){message.warning('请至少添加 2 个文件');return;}if(!outputDir){message.warning('请选择输出目录');return;}const sep=outputDir.includes('\\')?'\\':'/';const out=`${outputDir}${outputDir.endsWith(sep)?'':sep}merged.mp3`;const tid=`task-${Date.now()}`;addTask({key:tid,name:`合并 ${files.length} 个音频`,inputFile:files.map(f=>f.name).join(', '),outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    const inputs=files.map((_,i)=>`[${i}:a]`).join('');
    const filter=`${inputs}concat=n=${files.length}:v=0:a=1[outa]`;
    run({taskId:tid,inputPath:files[0].path,inputPaths:files.map(f=>f.path),outputPath:out,audioCodec:codec,extraArgs:['-filter_complex',filter,'-map','[outa]',...(bitrate?['-b:a',bitrate]:[])]});},[files,outputDir,codec,bitrate,run,ffmpegOk,addTask]);

  const cmd=files.length>=2?`ffmpeg -y ${files.map(f=>`-i "${f.path}"`).join(' ')} -filter_complex ${files.map((_,i)=>`[${i}:a]`).join('')}concat=n=${files.length}:v=0:a=1[outa] -map "[outa]" -c:a ${codec}${bitrate?` -b:a ${bitrate}`:''} "${outputDir||'{目录}'}/merged.mp3"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ffmpegOk&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}{mismatch&&<Alert type="warning" message="编码不同" description="音频编码器不一致，将重新编码合并。" showIcon icon={<ExclamationCircleOutlined/>}/>}
    <Card title="添加音频"><FileDropZone onFilesAdded={handleFiles} accept=".mp3,.wav,.flac,.aac,.ogg,.wma,.m4a" hint="拖入多个音频文件按顺序合并"/>
      {files.length>0&&<div style={{marginTop:16}}>{files.map((f,i)=>(<div key={f.key} style={{display:'flex',alignItems:'center',padding:'8px 12px',background:'#fafafa',borderRadius:8,marginBottom:6,gap:8}}><span style={{color:'#9ca3af',fontSize:12,minWidth:24}}>#{i+1}</span><span style={{flex:1,fontSize:14,fontWeight:500}}>{f.name}</span><Tag>{f.codec}</Tag><span style={{fontSize:12,color:'#6b7280'}}>{f.duration}</span><Button type="text" size="small" icon={<ArrowUpOutlined/>} disabled={i===0} onClick={()=>up(i)}/><Button type="text" size="small" icon={<ArrowDownOutlined/>} disabled={i===files.length-1} onClick={()=>down(i)}/><Button type="text" size="small" danger icon={<DeleteOutlined/>} onClick={()=>handleRemove(f.key)}/></div>))}</div>}
    </Card>
    <Card title="输出参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="aac">AAC</Option><Option value="libmp3lame">MP3</Option><Option value="flac">FLAC</Option><Option value="libopus">Opus</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>比特率</label><Select value={bitrate} onChange={setBr} style={{width:'100%'}}><Option value="">自动</Option><Option value="320k">320k</Option><Option value="256k">256k</Option><Option value="192k">192k</Option><Option value="128k">128k</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={outputDir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>=2?`已添加 ${files.length} 个文件`:'请至少添加 2 个文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length<2}>开始合并</Button></div></Card>
  </div>);
}
