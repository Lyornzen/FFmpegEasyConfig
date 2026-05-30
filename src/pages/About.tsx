import { useState, useEffect } from 'react';
import { Card, Typography, Divider, Space, Button } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function About() {
  const [ffVersion, setFfVersion] = useState('检测中...');

  useEffect(() => {
    window.electronAPI?.app?.getFfmpegStatus().then((s) => {
      if (s?.ffmpegVersion) {
        // Extract version number from "ffmpeg version N-xxx Copyright..."
        const m = s.ffmpegVersion.match(/ffmpeg version ([^\s]+)/);
        setFfVersion(m ? m[1] : s.ffmpegVersion);
      } else {
        setFfVersion('未检测到');
      }
    });
  }, []);

  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <img
          src="./icon.png"
          alt="FFmpegEasyConfig"
          style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 24 }}
        />
        <Title level={2} style={{ marginBottom: 4 }}>FFmpegEasyConfig</Title>
        <Text type="secondary" style={{ fontSize: 16 }}>现代化桌面端 FFmpeg 图形界面</Text>

        <Divider />

        <Space direction="vertical" size={8}>
          <Text>应用版本: <Text strong>1.1.0</Text></Text>
          <Text>技术栈: Electron · React · TypeScript · Ant Design</Text>
          <Text>FFmpeg 版本: <Text strong>{ffVersion}</Text></Text>
        </Space>

        <Divider />

        <Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto' }}>
          FFmpegEasyConfig 是一个现代化的 FFmpeg 桌面客户端，提供直观的图形界面来完成视频格式转换、
          视频剪辑、音频处理、字幕处理等常见多媒体任务，无需记忆复杂的命令行参数。
        </Paragraph>

        <Divider />

        <Button
          type="link"
          size="large"
          icon={<GithubOutlined />}
          onClick={() => window.electronAPI?.app?.openExternal('https://github.com/Lyornzen/FFmpeg-GUI')}
        >
          GitHub 项目主页
        </Button>
      </div>
    </Card>
  );
}
