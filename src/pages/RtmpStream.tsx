import { Card, Result } from 'antd';
import { SendOutlined } from '@ant-design/icons';

export default function RtmpStream() {
  return <Card><Result icon={<SendOutlined style={{fontSize:64,color:'#13c2c2'}}/>} title="RTMP 推流" subTitle="推送视频流到 RTMP 服务器。功能开发中..."/></Card>;
}
