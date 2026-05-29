import { Card, Result } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

export default function SubtitleConvert() {
  return <Card><Result icon={<SwapOutlined style={{fontSize:64,color:'#eb2f96'}}/>} title="字幕格式转换" subTitle="在不同字幕格式之间转换。功能开发中..."/></Card>;
}
