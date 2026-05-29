import { Card, Result } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

export default function GifOptimize() {
  return <Card><Result icon={<ThunderboltOutlined style={{fontSize:64,color:'#722ed1'}}/>} title="GIF 优化" subTitle="优化 GIF 文件大小和画质。功能开发中..."/></Card>;
}
