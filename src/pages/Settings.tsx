import { useState, useEffect } from 'react';
import { Card, Button, Space, Select, Input, Descriptions, Divider, Switch, message, Tag, Typography } from 'antd';
import {
  SettingOutlined, FolderOpenOutlined, ReloadOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, FileTextOutlined, DeleteOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { Text, Title } = Typography;

export default function Settings() {
  const [status, setStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [defFormat, setDefFormat] = useState(localStorage.getItem('ffgui_defFormat') || 'mp4');
  const [defDir, setDefDir] = useState(localStorage.getItem('ffgui_defDir') || '');

  const loadStatus = async () => {
    setChecking(true);
    const s = await window.electronAPI?.app?.getFfmpegStatus();
    setStatus(s);
    setChecking(false);
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSelectFfmpeg = async () => {
    await window.electronAPI?.app?.selectFfmpegPath();
    loadStatus();
  };
  const handleSelectFfprobe = async () => {
    await window.electronAPI?.app?.selectFfprobePath();
    loadStatus();
  };

  const saveDefFormat = (v: string) => { setDefFormat(v); localStorage.setItem('ffgui_defFormat', v); message.success('已保存'); };
  const saveDefDir = (v: string) => { setDefDir(v); localStorage.setItem('ffgui_defDir', v); message.success('已保存'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      <Title level={4} style={{ margin: 0 }}><SettingOutlined /> 设置</Title>

      {/* FFmpeg Tools */}
      <Card title="FFmpeg 工具链">
        <Descriptions column={1} size="small" bordered labelStyle={{ width: 120 }}>
          <Descriptions.Item label="FFmpeg">
            <Space>
              {status?.ffmpeg
                ? <Tag color="success" icon={<CheckCircleOutlined />}>已安装</Tag>
                : <Tag color="error" icon={<ExclamationCircleOutlined />}>未检测到</Tag>}
              {status?.ffmpegVersion && <Text type="secondary" style={{ fontSize: 12 }}>{status.ffmpegVersion.split('Copyright')[0]?.trim()}</Text>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="FFprobe">
            <Space>
              {status?.ffprobe
                ? <Tag color="success" icon={<CheckCircleOutlined />}>已安装</Tag>
                : <Tag color="error" icon={<ExclamationCircleOutlined />}>未检测到</Tag>}
              {status?.ffprobeVersion && <Text type="secondary" style={{ fontSize: 12 }}>{status.ffprobeVersion.split('Copyright')[0]?.trim()}</Text>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="操作">
            <Space>
              <Button size="small" icon={<ReloadOutlined />} loading={checking} onClick={loadStatus}>重新检测</Button>
              <Button size="small" icon={<FolderOpenOutlined />} onClick={handleSelectFfmpeg}>选择 ffmpeg.exe</Button>
              <Button size="small" icon={<FolderOpenOutlined />} onClick={handleSelectFfprobe}>选择 ffprobe.exe</Button>
            </Space>
          </Descriptions.Item>
        </Descriptions>
        {(status?.ffmpegPath && status.ffmpegPath !== 'ffmpeg') && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
            自定义 ffmpeg: <Text code>{status.ffmpegPath}</Text>
          </div>
        )}
      </Card>

      {/* Defaults */}
      <Card title="默认输出设置">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>默认输出格式</label>
            <Select value={defFormat} onChange={saveDefFormat} style={{ width: '100%' }}>
              <Option value="mp4">MP4</Option><Option value="mkv">MKV</Option><Option value="mov">MOV</Option>
              <Option value="avi">AVI</Option><Option value="webm">WebM</Option>
            </Select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>默认输出目录</label>
            <Input
              value={defDir}
              onChange={e => setDefDir(e.target.value)}
              onBlur={() => saveDefDir(defDir)}
              placeholder="留空则每次手动选择"
              addonAfter={<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={async () => {
                const d = await window.electronAPI?.file?.openDirDialog();
                if (d) saveDefDir(d);
              }}>浏览</span>}
            />
          </div>
        </div>
      </Card>

      {/* App Info */}
      <Card title="应用信息">
        <Descriptions column={1} size="small" bordered labelStyle={{ width: 120 }}>
          <Descriptions.Item label="版本">1.1.0</Descriptions.Item>
          <Descriptions.Item label="技术栈">Electron · React · TypeScript · Ant Design 5</Descriptions.Item>
          <Descriptions.Item label="日志文件">
            <Space>
              <FileTextOutlined />
              <Text code>应用目录/log.txt</Text>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
