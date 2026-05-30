import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Input, message, Alert } from 'antd';
import { FormOutlined, CaretRightOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import CommandPreview from '../shared/CommandPreview';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useTaskContext } from '../contexts/TaskContext';
import { joinPath } from '../shared/pathUtils';

export default function CustomParams() {
  const [ff,setFf]=useState(true);
  const [input,setInput]=useState('');
  const [cmd,setCmd]=useState('-c:v libx264 -crf 23 -preset medium -c:a aac');
  const [outputName,setOut]=useState('output.mp4');
  const [dir,setDir]=useState('');
  const {addTask,updateTask}=useTaskContext();
  useEffect(()=>{window.electronAPI?.app?.getFfmpegStatus().then(s=>setFf(s?.ffmpeg??false));},[]);
  const {run,isRunning}=useFFmpeg({onProgress:p=>updateTask(p.taskId,{progress:p.percent||0}),onComplete:(tid,out)=>{message.success(`输出: ${out}`);updateTask(tid,{status:'done',progress:100});},onError:tid=>updateTask(tid,{status:'error'})});
  const fullCmd=`ffmpeg -y -i "${input||'{输入}'}" ${cmd} "${dir?joinPath(dir,outputName):outputName}"`;
  const handleStart=useCallback(()=>{if(!ff){message.error('FFmpeg 未安装');return;}if(!input){message.warning('请选择输入文件');return;}if(!dir){message.warning('请选择输出目录');return;}const out=joinPath(dir,outputName);const tid=`task-${Date.now()}`;addTask({key:tid,name:`自定义 ${input}`,inputFile:input,outputFile:out,progress:0,speed:'—',remaining:'—',status:'processing'});
    const extraArgs=cmd.split(/\s+/).filter(Boolean);
    run({taskId:tid,inputPath:input,outputPath:out,extraArgs});},[input,cmd,outputName,dir,run,ff,addTask]);
  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>{!ff&&<Alert type="warning" message="FFmpeg 未检测到" icon={<ExclamationCircleOutlined/>} showIcon/>}
    <Card title="输入文件"><Input placeholder="输入文件路径..." value={input} onChange={e=>setInput(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const paths=await window.electronAPI?.file?.openDialog();if(paths&&paths.length>0)setInput(paths[0]);}}>浏览</span>}/></Card>
    <Card title="FFmpeg 参数"><Input.TextArea rows={6} value={cmd} onChange={e=>setCmd(e.target.value)} placeholder="-c:v libx264 -crf 23 -preset medium -c:a aac" style={{fontFamily:'monospace',fontSize:13}}/></Card>
    <Card title="输出"><Input placeholder="输出文件名..." value={outputName} onChange={e=>setOut(e.target.value)} addonAfter={<span style={{cursor:'pointer',color:'#1677ff'}} onClick={async()=>{const d=await window.electronAPI?.file?.openDirDialog();if(d)setDir(d);}}>{dir?'已选':'浏览'}</span>}/></Card>
    <Card title="命令预览"><CommandPreview command={fullCmd}/></Card>
    <Card><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:'#6b7280'}}>{input?'就绪':'请选择输入文件'}</span><Button type="primary" size="large" icon={<CaretRightOutlined/>} onClick={handleStart} loading={isRunning} disabled={!input}>执行</Button></div></Card>
  </div>);
}
