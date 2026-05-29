import { Card, Typography, Divider, Space } from 'antd';
import { InfoCircleOutlined, GithubOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function About() {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div
          style={{
            width: 80,
            height: 80,
            background: '#1677ff',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 36,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          F
        </div>
        <Title level={2} style={{ marginBottom: 4 }}>FFmpeg UI</Title>
        <Text type="secondary" style={{ fontSize: 16 }}>现代化桌面端 FFmpeg 图形界面</Text>

        <Divider />

        <Space direction="vertical" size={8}>
          <Text>版本: <Text strong>1.0.0</Text></Text>
          <Text>技术栈: Electron · React · TypeScript · Ant Design</Text>
          <Text>FFmpeg 版本: 需要系统已安装 FFmpeg</Text>
        </Space>

        <Divider />

        <Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto' }}>
          FFmpeg UI 是一个现代化的 FFmpeg 桌面客户端，提供直观的图形界面来完成视频格式转换、
          视频剪辑、音频处理、字幕处理等常见多媒体任务，无需记忆复杂的命令行参数。
        </Paragraph>
      </div>
    </Card>
  );
}
