import { Card, Result } from 'antd';
import { CopyrightOutlined } from '@ant-design/icons';

export default function VideoWatermark() {
  return <Card><Result icon={<CopyrightOutlined style={{fontSize:64,color:'#1677ff'}}/>} title="添加水印" subTitle="为视频添加文字或图片水印。功能开发中..."/></Card>;
}
