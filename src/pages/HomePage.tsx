import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Alert, Button, Space, Spin, message, Empty } from 'antd';
import {
  VideoCameraOutlined,
  AudioOutlined,
  FileTextOutlined,
  PictureOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTaskContext } from '../contexts/TaskContext';
import TaskQueue from '../components/TaskQueue';

const quickActions = [
  { icon: <SwapOutlined />, title: '视频格式转换', desc: '转换视频格式，调整编码参数', path: '/video/convert', color: '#1677ff' },
  { icon: <VideoCameraOutlined />, title: '视频压缩', desc: '压缩视频大小，保持画质', path: '/video/compress', color: '#52c41a' },
  { icon: <AudioOutlined />, title: '音频格式转换', desc: '转换音频格式与参数', path: '/audio/convert', color: '#faad14' },
  { icon: <PictureOutlined />, title: '视频转 GIF', desc: '将视频片段转为 GIF', path: '/image/to-gif', color: '#722ed1' },
  { icon: <FileTextOutlined />, title: '添加字幕', desc: '为视频添加字幕轨道', path: '/subtitle/add', color: '#eb2f96' },
  { icon: <ThunderboltOutlined />, title: '批处理任务', desc: '批量处理媒体文件', path: '/advanced/batch', color: '#13c2c2' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { tasks, updateTask } = useTaskContext();
  const [ffmpegStatus, setFfmpegStatus] = useState<{ ffmpeg: boolean; ffprobe: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const status = await window.electronAPI?.app?.getFfmpegStatus();
      setFfmpegStatus(status || { ffmpeg: false, ffprobe: false });
    } catch {
      setFfmpegStatus({ ffmpeg: false, ffprobe: false });
    }
    setChecking(false);
  };

  useEffect(() => {
    checkStatus();
    // Listen for async detection result from main process
    const unsub = window.electronAPI?.app?.onFfmpegStatus((status) => {
      setFfmpegStatus(status);
    });
    return () => { unsub?.(); };
  }, []);

  const handleDownloadFfmpeg = () => {
    window.electronAPI?.app?.openExternal('https://ffmpeg.org/download.html');
  };

  const handleSelectFfmpeg = async () => {
    const p = await window.electronAPI?.app?.selectFfmpegPath();
    if (p) message.success(`已设置 ffmpeg: ${p}`);
  };

  const handleSelectFfprobe = async () => {
    const p = await window.electronAPI?.app?.selectFfprobePath();
    if (p) message.success(`已设置 ffprobe: ${p}`);
  };

  const detectPass = ffmpegStatus?.ffmpeg && ffmpegStatus?.ffprobe;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* FFmpeg Status Banner */}
      {ffmpegStatus === null ? (
        <Alert
          type="info"
          message="正在检测 FFmpeg 环境..."
          description="请稍候，正在检查系统是否安装了 FFmpeg 和 FFprobe"
          icon={<Spin size="small" />}
          showIcon
          action={
            <Button size="small" loading icon={<ReloadOutlined />} onClick={checkStatus}>
              重新检测
            </Button>
          }
        />
      ) : detectPass ? (
        <Alert
          type="success"
          message="FFmpeg 环境就绪"
          description="FFmpeg 和 FFprobe 已正确安装，所有功能可用"
          icon={<CheckCircleOutlined />}
          showIcon
          banner
        />
      ) : (
        <Alert
          type="error"
          message="FFmpeg 未安装"
          description={
            <span>
              系统中未检测到 FFmpeg {
                !ffmpegStatus.ffmpeg && !ffmpegStatus.ffprobe ? '和 FFprobe'
                : !ffmpegStatus.ffmpeg ? '' : 'FFprobe'
              }。视频转码和媒体信息获取功能将不可用。
              <br />
              请安装 FFmpeg 并将其添加到系统 PATH 环境变量中。
            </span>
          }
          icon={<ExclamationCircleOutlined />}
          showIcon
          action={
            <Space size={4} wrap>
              <Button size="small" icon={<ReloadOutlined />} onClick={checkStatus} loading={checking}>
                重新检测
              </Button>
              <Button size="small" icon={<FolderOpenOutlined />} onClick={handleSelectFfmpeg}>
                选择 ffmpeg.exe
              </Button>
              <Button size="small" icon={<FolderOpenOutlined />} onClick={handleSelectFfprobe}>
                选择 ffprobe.exe
              </Button>
              <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadFfmpeg}>
                下载 FFmpeg
              </Button>
            </Space>
          }
        />
      )}

      {/* Stats Row */}
      <Row gutter={24}>
        <Col span={6}>
          <Card>
            <Statistic title="FFmpeg" value={ffmpegStatus?.ffmpeg ? '已安装' : '未安装'} prefix={ffmpegStatus?.ffmpeg ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="FFprobe" value={ffmpegStatus?.ffprobe ? '已安装' : '未安装'} prefix={ffmpegStatus?.ffprobe ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃任务" value={0} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="日志文件" value="log.txt" prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="快速操作">
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col span={8} key={action.title}>
              <Card
                hoverable
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(action.path)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44, height: 44,
                      background: `${action.color}15`,
                      borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: action.color,
                    }}
                  >
                    {action.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{action.title}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{action.desc}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Task Queue */}
      <TaskQueue
        tasks={tasks}
        onStop={(key) => {
          window.electronAPI?.ffmpeg.cancel(key);
          updateTask(key, { status: 'error' });
          message.info('任务已取消');
        }}
      />
    </div>
  );
}
