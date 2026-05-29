import { Card, Result } from 'antd';
import { FormOutlined } from '@ant-design/icons';

export default function CustomParams() {
  return <Card><Result icon={<FormOutlined style={{fontSize:64,color:'#1677ff'}}/>} title="自定义参数" subTitle="使用自定义 FFmpeg 参数进行转码。功能开发中..."/></Card>;
}
