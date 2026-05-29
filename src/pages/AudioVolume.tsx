import { Card, Result } from 'antd';
import { DashboardOutlined } from '@ant-design/icons';

export default function AudioVolume() {
  return <Card><Result icon={<DashboardOutlined style={{fontSize:64,color:'#52c41a'}}/>} title="音量调节" subTitle="调整音频音量大小。功能开发中..."/></Card>;
}
