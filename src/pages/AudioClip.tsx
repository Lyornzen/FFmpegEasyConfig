import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select, Slider, message, Alert } from 'antd';
import { ScissorOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FileDropZone from '../shared/FileDropZone';
import FileInfoTable, { MediaFile } from '../shared/FileInfoTable';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';

const { Option } = Select;
function formatFileSize(b: number): string { if (b===0) return '—'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }
function codecToExt(c: string): string { const m: Record<string,string>={aac:'m4a',libmp3lame:'mp3',flac:'flac',copy:'m4a'}; return m[c]||'m4a'; }
function ts(t:string):number{const p=t.split(':').map(Number);return(p[0]||0)*3600+(p[1]||0)*60+(p[2]||0);}
function st(s:number):string{const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=Math.floor(s%60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
function pd(d:string):number{return d==='—'?300:ts(d);}
let c=0;

export default function AudioClip() {
  const [files,setFiles]=useState<MediaFile[]>([]);
  const [sf,setSf]=useState<MediaFile|null>(null);
  const [ff,setFf]=useState(true);
  const [start,setStart]=useState('00:00:00');
  const [end,setEnd]=useState('00:00:10');
  const [codec,setCodec]=useState('aac');
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  const total=useMemo(()=>sf?pd(sf.duration):300,[sf]);
  const ss=ts(start);const es=Math.min(ts(end),total);const dur=es-ss;
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const handleFiles=useCallback(async(nf:File[])=>{const m=nf.map(f=>{c++;return{key:`f-${c}`,name:f.name,path:(f as any).path||f.name,duration:'—',resolution:'—',fileSize:formatFileSize(f.size),status:'ready' as const,type:'audio' as const};});setFiles(p=>[...p,...m]);if(!sf&&m.length>0)setSf(m[0]);for(const mf of m){const info=await window.electronAPI?.file?.getInfo(mf.path);if(info){setFiles(p=>p.map(f=>f.key===mf.key?{...f,duration:info.duration}:f));setSf(p=>p?.key===mf.key?{...p!,duration:info.duration}:p);}}},[sf]);
  const ext=codecToExt(codec);
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(files.length===0){message.warning('请先添加文件');return;}if(!dir){message.warning('请选择输出目录');return;}const f=files[0];if(dur<=0){message.warning('结束时间必须大于开始时间');return;}const sep=dir.includes('\\')?'\\':'/';const out=`${dir}${dir.endsWith(sep)?'':sep}${f.name.replace(/\.[^.]+$/,'')}_clip.${ext}`;const tid=`task-${Date.now()}`;addTask({key:tid,name:`剪辑 ${f.name}`,inputFile:f.path,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});run({taskId:tid,inputPath:f.path,outputPath:out,audioCodec:codec,extraArgs:['-ss',start,'-t',st(Math.max(0,dur))]});},[files,dir,codec,start,end,ss,es,ext,dur,run,ff,addTask]);
  const cmd=files.length>0&&dir?`ffmpeg -y -ss ${start} -t ${st(Math.max(0,dur))} -i "${files[0].path}" -c:a ${codec} "${dir}/${files[0].name.replace(/\.[^.]+$/,'')}_clip.${ext}"`:'';
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="选择音频"><FileDropZone onFilesAdded={handleFiles} accept=".mp3,.wav,.flac,.aac,.ogg,.wma,.m4a" hint="支持 MP3, WAV, FLAC, AAC 等音频格式"/><FileInfoTable files={files} onRemove={k=>{setFiles(p=>p.filter(f=>f.key!==k));if(sf?.key===k)setSf(files.length>1?files[0]:null);}}/></Card>
    {sf&&sf.duration!=='—'&&(<Card title="时间轴"><div style={{padding:'0 8px'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12,color:'#6b7280'}}><span>00:00:00</span><span style={{color:'#1677ff',fontWeight:500}}>已选: {st(ss)} – {st(es)} ({st(dur)})</span><span>{sf.duration}</span></div><Slider range min={0} max={total} step={1} value={[ss,es]} onChange={(v)=>{setStart(st(v[0]));setEnd(st(v[1]));}} tooltip={{formatter:v=>st(v||0)}}/></div></Card>)}
    <Card title="剪辑参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>开始时间</label><Input value={start} onChange={e=>setStart(e.target.value)} style={{width:160}}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>结束时间</label><Input value={end} onChange={e=>setEnd(e.target.value)} style={{width:160}}/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:160}}><Option value="aac">AAC (.m4a)</Option><Option value="libmp3lame">MP3</Option><Option value="flac">FLAC</Option><Option value="copy">复制流</Option></Select></div>
    </div></Card>
    <Card title="输出设置"><Input placeholder="选择输出目录..." value={dir} onChange={e=>setDir(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>浏览</span>}/></Card>
    {cmd&&<Card title="命令预览"><CommandPreview command={cmd}/></Card>}
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{files.length>0?`剪辑 ${st(dur)}`:'请先添加文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={files.length===0||dur<=0}>开始剪辑</Button></div></Card>
  </div>);
}
