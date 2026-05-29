import { Card, Result } from 'antd';
import { ScissorOutlined } from '@ant-design/icons';

export default function AudioClip() {
  return <Card><Result icon={<ScissorOutlined style={{fontSize:64,color:'#52c41a'}}/>} title="音频剪辑" subTitle="精确裁剪音频片段。功能开发中..."/></Card>;
}
