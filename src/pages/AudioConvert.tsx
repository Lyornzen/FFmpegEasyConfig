import { Card, Result } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

export default function AudioConvert() {
  return <Card><Result icon={<SwapOutlined style={{fontSize:64,color:'#52c41a'}}/>} title="音频格式转换" subTitle="转换音频文件格式，支持主流音频编码器。功能开发中..."/></Card>;
}
