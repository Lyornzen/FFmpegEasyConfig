import { Card, Result } from 'antd';
import { RotateRightOutlined } from '@ant-design/icons';

export default function VideoRotate() {
  return <Card><Result icon={<RotateRightOutlined style={{fontSize:64,color:'#1677ff'}}/>} title="视频旋转" subTitle="旋转或翻转视频画面方向。功能开发中..."/></Card>;
}
