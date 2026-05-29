import { Card, Result } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

export default function GpuEncode() {
  return <Card><Result icon={<ThunderboltOutlined style={{fontSize:64,color:'#1677ff'}}/>} title="GPU 编码" subTitle="使用硬件加速进行编码。功能开发中..."/></Card>;
}
