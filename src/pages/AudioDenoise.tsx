import { Card, Result } from 'antd';
import { ControlOutlined } from '@ant-design/icons';

export default function AudioDenoise() {
  return <Card><Result icon={<ControlOutlined style={{fontSize:64,color:'#52c41a'}}/>} title="音频降噪" subTitle="减少音频中的背景噪音。功能开发中..."/></Card>;
}
