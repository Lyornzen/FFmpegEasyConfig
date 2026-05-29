import { Card, Result } from 'antd';
import { ImportOutlined } from '@ant-design/icons';

export default function AudioExtract() {
  return <Card><Result icon={<ImportOutlined style={{fontSize:64,color:'#52c41a'}}/>} title="音频提取" subTitle="从视频文件中提取音频轨道。功能开发中..."/></Card>;
}
