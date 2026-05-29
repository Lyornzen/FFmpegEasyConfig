import { Card, Result } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

export default function HlsConvert() {
  return <Card><Result icon={<SwapOutlined style={{fontSize:64,color:'#13c2c2'}}/>} title="HLS 转换" subTitle="将视频转换为 HLS 流格式。功能开发中..."/></Card>;
}
