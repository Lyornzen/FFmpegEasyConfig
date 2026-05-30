import { useState } from 'react';
import { Card, Button, Select, Input, message } from 'antd';
import { CodeOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import CommandPreview from '../shared/CommandPreview';

const { Option } = Select;

export default function FFmpegCmdBuilder() {
  const [inputs,setInputs]=useState<string[]>(['']);
  const [codec,setCodec]=useState('copy');
  const [crf,setCrf]=useState('');
  const [preset,setPreset]=useState('');
  const [resolution,setRes]=useState('');
  const [fps,setFps]=useState('');
  const [bitrate,setBr]=useState('');
  const [extra,setExtra]=useState('');
  const [output,setOut]=useState('output.mp4');
  const [copied,setCopied]=useState(false);

  const cmd = [
    'ffmpeg -y',
    ...inputs.filter(Boolean).map(i=>`-i "${i}"`),
    codec!=='copy'?`-c:v ${codec}`:'-c:v copy',
    crf?`-crf ${crf}`:'',
    preset?`-preset ${preset}`:'',
    resolution?`-s ${resolution.replace(':','x')}`:'',
    fps?`-r ${fps}`:'',
    bitrate?`-b:v ${bitrate}`:'',
    extra,
    `"${output}"`,
  ].filter(Boolean).join(' ');

  const handleCopy=async()=>{await navigator.clipboard.writeText(cmd);setCopied(true);message.success('已复制');setTimeout(()=>setCopied(false),2000);};

  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>
    <Card title="输入文件">
      {inputs.map((v,i)=>(<div key={i} style={{display:'flex',gap:8,marginBottom:8}}><Input value={v} onChange={e=>{const a=[...inputs];a[i]=e.target.value;setInputs(a);}} placeholder={`输入文件 #${i+1}`}/>{i===inputs.length-1?<Button onClick={()=>setInputs([...inputs,''])}>+</Button>:<Button danger onClick={()=>setInputs(inputs.filter((_,j)=>j!==i))}>-</Button>}</div>))}
    </Card>
    <Card title="参数"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>视频编码</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}><Option value="copy">复制流</Option><Option value="libx264">H.264</Option><Option value="libx265">H.265</Option><Option value="libvpx-vp9">VP9</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>CRF</label><Input value={crf} onChange={e=>setCrf(e.target.value)} placeholder="23"/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>Preset</label><Select value={preset} onChange={setPreset} style={{width:'100%'}}><Option value="">默认</Option><Option value="ultrafast">ultrafast</Option><Option value="veryfast">veryfast</Option><Option value="medium">medium</Option><Option value="slow">slow</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>分辨率</label><Select value={resolution} onChange={setRes} style={{width:'100%'}}><Option value="">保持</Option><Option value="1920:1080">1080p</Option><Option value="1280:720">720p</Option></Select></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>帧率</label><Input value={fps} onChange={e=>setFps(e.target.value)} placeholder="30"/></div>
      <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>比特率</label><Input value={bitrate} onChange={e=>setBr(e.target.value)} placeholder="5M"/></div>
    </div></Card>
    <Card title="自定义参数"><Input.TextArea rows={4} value={extra} onChange={e=>setExtra(e.target.value)} placeholder='例如: -ss 00:01:00 -t 00:00:30 -vf "hflip"' style={{fontFamily:'monospace',fontSize:13}}/></Card>
    <Card title="输出文件"><Input value={output} onChange={e=>setOut(e.target.value)} placeholder="output.mp4"/></Card>
    <Card title="生成的命令" extra={<Button size="small" icon={copied?<CheckOutlined/>:<CopyOutlined/>} onClick={handleCopy}>{copied?'已复制':'复制'}</Button>}><CommandPreview command={cmd}/></Card>
  </div>);
}
