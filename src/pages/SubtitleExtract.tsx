import { Card, Result } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

export default function SubtitleExtract() {
  return <Card><Result icon={<FileTextOutlined style={{fontSize:64,color:'#eb2f96'}}/>} title="提取字幕" subTitle="从视频中提取字幕文件。功能开发中..."/></Card>;
}
