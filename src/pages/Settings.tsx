import { Card, Result } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

export default function Settings() {
  return <Card><Result icon={<SettingOutlined style={{fontSize:64,color:'#6b7280'}}/>} title="设置" subTitle="应用程序设置与偏好。功能开发中..."/></Card>;
}
