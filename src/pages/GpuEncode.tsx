import { useState } from 'react';
import { Card, Button, Select, Input, Radio, message, Alert, Descriptions } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Option } = Select;

const gpuInfo = {
  nvidia: { name: 'NVIDIA NVENC', codecs: ['h264_nvenc','hevc_nvenc'], desc: '需要 NVIDIA 显卡 + 驱动' },
  amd: { name: 'AMD AMF', codecs: ['h264_amf','hevc_amf'], desc: '需要 AMD 显卡 + 驱动' },
  intel: { name: 'Intel QSV', codecs: ['h264_qsv','hevc_qsv'], desc: '需要 Intel 核显 + 驱动' },
  apple: { name: 'Apple VideoToolbox', codecs: ['h264_videotoolbox','hevc_videotoolbox'], desc: 'macOS 内置' },
};

const presets = { nvidia: ['p1','p4','p7'], amd: ['speed','balanced','quality'], intel: ['veryfast','faster','fast','medium'], apple: [] };

export default function GpuEncode() {
  const [vendor,setVendor]=useState<string>('nvidia');
  const [codec,setCodec]=useState('h264_nvenc');
  const [preset,setPreset]=useState('p4');
  const [bitrate,setBr]=useState('5000k');
  const [cmd,setCmd]=useState('');

  const info=gpuInfo[vendor as keyof typeof gpuInfo]||gpuInfo.nvidia;
  const presetsAvail=presets[vendor as keyof typeof presets]||[];

  const generate=()=>{
    const p=presetsAvail.length>0?` -preset ${preset}`:'';
    setCmd(`ffmpeg -y -hwaccel auto -i "input.mp4" -c:v ${codec}${p} -b:v ${bitrate} -c:a aac "output.mp4"`);
  };

  return (<div style={{display:'flex',flexDirection:'column',gap:24}}>
    <Card title="GPU 硬件加速编码">
      <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>使用 GPU 硬件编码器加速转码，速度远快于 CPU 编码。</p>
      <div style={{marginBottom:16}}><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>GPU 厂商</label>
        <Radio.Group value={vendor} onChange={e=>{setVendor(e.target.value);const c=gpuInfo[e.target.value as keyof typeof gpuInfo]?.codecs[0]||'h264_nvenc';setCodec(c);setPreset((presets[e.target.value as keyof typeof presets]||[])[0]||'');}}>
          <Radio.Button value="nvidia">NVIDIA</Radio.Button><Radio.Button value="amd">AMD</Radio.Button><Radio.Button value="intel">Intel</Radio.Button><Radio.Button value="apple">Apple</Radio.Button>
        </Radio.Group>
      </div>
      <Descriptions column={2} size="small" bordered style={{marginBottom:16}}>
        <Descriptions.Item label="厂商">{info.name}</Descriptions.Item>
        <Descriptions.Item label="说明">{info.desc}</Descriptions.Item>
      </Descriptions>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>编码器</label><Select value={codec} onChange={setCodec} style={{width:'100%'}}>{info.codecs.map(c=><Option key={c} value={c}>{c}</Option>)}</Select></div>
        {presetsAvail.length>0&&<div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>Preset</label><Select value={preset} onChange={setPreset} style={{width:'100%'}}>{presetsAvail.map(p=><Option key={p} value={p}>{p}</Option>)}</Select></div>}
        <div><label style={{fontSize:13,color:'#6b7280',display:'block',marginBottom:4}}>比特率</label><Select value={bitrate} onChange={setBr} style={{width:'100%'}}><Option value="8000k">8 Mbps</Option><Option value="5000k">5 Mbps</Option><Option value="2500k">2.5 Mbps</Option></Select></div>
      </div>
    </Card>
    <Card><Button type="primary" size="large" icon={<ThunderboltOutlined/>} onClick={generate}>生成命令</Button></Card>
    {cmd&&<Card title="生成的命令"><pre style={{background:'#1e1e1e',color:'#d4d4d4',padding:16,borderRadius:8,fontSize:13,fontFamily:'monospace',whiteSpace:'pre-wrap'}}>{cmd}</pre></Card>}
  </div>);
}
