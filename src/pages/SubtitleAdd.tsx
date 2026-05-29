import { Card, Result } from 'antd';
import { FileAddOutlined } from '@ant-design/icons';

export default function SubtitleAdd() {
  return <Card><Result icon={<FileAddOutlined style={{fontSize:64,color:'#eb2f96'}}/>} title="添加字幕" subTitle="为视频嵌入字幕轨道。功能开发中..."/></Card>;
}
