import { Card, Result } from 'antd';
import { PlaySquareOutlined } from '@ant-design/icons';

export default function ImageToVideo() {
  return <Card><Result icon={<PlaySquareOutlined style={{fontSize:64,color:'#722ed1'}}/>} title="图片转视频" subTitle="将图片序列合成为视频。功能开发中..."/></Card>;
}
