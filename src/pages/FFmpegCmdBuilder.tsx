import { Card, Result } from 'antd';
import { CodeOutlined } from '@ant-design/icons';

export default function FFmpegCmdBuilder() {
  return <Card><Result icon={<CodeOutlined style={{fontSize:64,color:'#1677ff'}}/>} title="FFmpeg 命令生成器" subTitle="可视化构建 FFmpeg 命令行。功能开发中..."/></Card>;
}
