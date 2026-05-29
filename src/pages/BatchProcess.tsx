import { Card, Result } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

export default function BatchProcess() {
  return <Card><Result icon={<AppstoreOutlined style={{fontSize:64,color:'#1677ff'}}/>} title="批处理任务" subTitle="批量处理多个媒体文件。功能开发中..."/></Card>;
}
