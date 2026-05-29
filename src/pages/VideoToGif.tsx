import { Card, Result } from 'antd';
import { FileGifOutlined } from '@ant-design/icons';

export default function VideoToGif() {
  return <Card><Result icon={<FileGifOutlined style={{fontSize:64,color:'#722ed1'}}/>} title="视频转 GIF" subTitle="将视频片段转换为 GIF 动图。功能开发中..."/></Card>;
}
