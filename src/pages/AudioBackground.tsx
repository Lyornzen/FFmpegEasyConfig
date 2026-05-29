import { Card, Result } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';

export default function AudioBackground() {
  return <Card><Result icon={<BgColorsOutlined style={{fontSize:64,color:'#52c41a'}}/>} title="添加背景音乐" subTitle="为音频或视频添加背景音乐。功能开发中..."/></Card>;
}
