import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileTextOutlined,
  PictureOutlined,
  WifiOutlined,
  ToolOutlined,
  SettingOutlined,
  FileSearchOutlined,
  InfoCircleOutlined,
  SwapOutlined,
  ScissorOutlined,
  MergeCellsOutlined,
  SplitCellsOutlined,
  CompressOutlined,
  CameraOutlined,
  RotateRightOutlined,
  CopyrightOutlined,
  SoundOutlined,
  ImportOutlined,
  DashboardOutlined,
  ControlOutlined,
  BgColorsOutlined,
  PushpinOutlined,
  FileAddOutlined,
  FileGifOutlined,
  ThunderboltOutlined,
  SendOutlined,
  PlaySquareOutlined,
  LaptopOutlined,
  CodeOutlined,
  AppstoreOutlined,
  PartitionOutlined,
  FormOutlined,
} from '@ant-design/icons';

type MenuItem = Required<MenuProps>['items'][number];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      key: 'common',
      label: '常用',
      type: 'group',
      children: [
        {
          key: '/',
          label: '首页',
          icon: <HomeOutlined />,
        },
      ],
    },
    {
      key: 'video',
      label: '视频操作',
      type: 'group',
      children: [
        { key: '/video/convert', label: '视频格式转换', icon: <SwapOutlined /> },
        { key: '/video/clip', label: '视频剪辑', icon: <ScissorOutlined /> },
        { key: '/video/merge', label: '视频合并', icon: <MergeCellsOutlined /> },
        { key: '/video/split', label: '视频分割', icon: <SplitCellsOutlined /> },
        { key: '/video/compress', label: '视频压缩', icon: <CompressOutlined /> },
        { key: '/video/extract-frame', label: '视频提取帧', icon: <CameraOutlined /> },
        { key: '/video/rotate', label: '视频旋转', icon: <RotateRightOutlined /> },
        { key: '/video/watermark', label: '添加水印', icon: <CopyrightOutlined /> },
      ],
    },
    {
      key: 'audio',
      label: '音频操作',
      type: 'group',
      children: [
        { key: '/audio/convert', label: '音频格式转换', icon: <SwapOutlined /> },
        { key: '/audio/clip', label: '音频剪辑', icon: <ScissorOutlined /> },
        { key: '/audio/merge', label: '音频合并', icon: <MergeCellsOutlined /> },
        { key: '/audio/extract', label: '音频提取', icon: <ImportOutlined /> },
        { key: '/audio/volume', label: '音量调节', icon: <DashboardOutlined /> },
        { key: '/audio/background', label: '添加背景音乐', icon: <BgColorsOutlined /> },
        { key: '/audio/denoise', label: '音频降噪', icon: <ControlOutlined /> },
      ],
    },
    {
      key: 'subtitle',
      label: '字幕处理',
      type: 'group',
      children: [
        { key: '/subtitle/add', label: '添加字幕', icon: <FileAddOutlined /> },
        { key: '/subtitle/extract', label: '提取字幕', icon: <FileTextOutlined /> },
        { key: '/subtitle/convert', label: '字幕格式转换', icon: <SwapOutlined /> },
      ],
    },
    {
      key: 'image',
      label: '图片处理',
      type: 'group',
      children: [
        { key: '/image/to-video', label: '图片转视频', icon: <PlaySquareOutlined /> },
        { key: '/image/to-gif', label: '视频转 GIF', icon: <FileGifOutlined /> },
        { key: '/image/gif-optimize', label: 'GIF 优化', icon: <ThunderboltOutlined /> },
      ],
    },
    {
      key: 'stream',
      label: '流媒体',
      type: 'group',
      children: [
        { key: '/stream/rtmp', label: 'RTMP 推流', icon: <SendOutlined /> },
        { key: '/stream/hls', label: 'HLS 转换', icon: <SwapOutlined /> },
        { key: '/stream/screen', label: '录屏推流', icon: <LaptopOutlined /> },
      ],
    },
    {
      key: 'advanced',
      label: '高级功能',
      type: 'group',
      children: [
        { key: '/advanced/cmd-builder', label: 'FFmpeg 命令生成器', icon: <CodeOutlined /> },
        { key: '/advanced/batch', label: '批处理任务', icon: <AppstoreOutlined /> },
        { key: '/advanced/gpu', label: 'GPU 编码', icon: <ThunderboltOutlined /> },
        { key: '/advanced/custom', label: '自定义参数', icon: <FormOutlined /> },
      ],
    },
    {
      key: 'system',
      label: '系统',
      type: 'group',
      children: [
        { key: '/system/settings', label: '设置', icon: <SettingOutlined /> },
        { key: '/system/logs', label: '日志', icon: <FileSearchOutlined /> },
        { key: '/system/about', label: '关于', icon: <InfoCircleOutlined /> },
      ],
    },
  ];

  return (
    <div style={{ padding: '12px 0' }}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['video', 'audio']}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
