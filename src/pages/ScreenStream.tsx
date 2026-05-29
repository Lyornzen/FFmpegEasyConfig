import { Card, Result } from 'antd';
import { LaptopOutlined } from '@ant-design/icons';

export default function ScreenStream() {
  return <Card><Result icon={<LaptopOutlined style={{fontSize:64,color:'#13c2c2'}}/>} title="录屏推流" subTitle="录制屏幕并推流。功能开发中..."/></Card>;
}
