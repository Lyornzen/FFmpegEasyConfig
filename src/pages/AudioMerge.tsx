import { Card, Result } from 'antd';
import { MergeCellsOutlined } from '@ant-design/icons';

export default function AudioMerge() {
  return <Card><Result icon={<MergeCellsOutlined style={{fontSize:64,color:'#52c41a'}}/>} title="音频合并" subTitle="将多个音频文件合并为一个。功能开发中..."/></Card>;
}
