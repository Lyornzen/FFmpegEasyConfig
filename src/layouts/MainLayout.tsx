import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import HeaderBar from '../components/HeaderBar';
import Sidebar from '../components/Sidebar';

const { Sider, Content } = Layout;

const pageTitles: Record<string, { title: string; desc: string }> = {
  '/': { title: '首页', desc: '欢迎使用 FFmpeg UI，选择功能开始处理媒体文件' },
  '/video/convert': { title: '视频格式转换', desc: '快速转换视频格式，支持多种编码器与参数设置' },
  '/video/clip': { title: '视频剪辑', desc: '精确裁剪视频片段，设置起止时间' },
  '/video/merge': { title: '视频合并', desc: '将多个视频文件合并为一个完整视频' },
  '/video/split': { title: '视频分割', desc: '按时间或文件大小分割视频' },
  '/video/compress': { title: '视频压缩', desc: '压缩视频文件大小，保持最佳画质' },
  '/video/extract-frame': { title: '视频提取帧', desc: '从视频中提取关键帧或指定时间点的画面' },
  '/video/rotate': { title: '视频旋转', desc: '旋转或翻转视频画面方向' },
  '/video/watermark': { title: '添加水印', desc: '为视频添加文字或图片水印' },
  '/audio/convert': { title: '音频格式转换', desc: '转换音频文件格式，支持主流音频编码器' },
  '/audio/clip': { title: '音频剪辑', desc: '精确裁剪音频片段' },
  '/audio/merge': { title: '音频合并', desc: '将多个音频文件合并为一个' },
  '/audio/extract': { title: '音频提取', desc: '从视频文件中提取音频轨道' },
  '/audio/volume': { title: '音量调节', desc: '调整音频音量大小' },
  '/audio/background': { title: '添加背景音乐', desc: '为音频或视频添加背景音乐' },
  '/audio/denoise': { title: '音频降噪', desc: '减少音频中的背景噪音' },
  '/subtitle/add': { title: '添加字幕', desc: '为视频嵌入字幕轨道' },
  '/subtitle/extract': { title: '提取字幕', desc: '从视频中提取字幕文件' },
  '/subtitle/convert': { title: '字幕格式转换', desc: '在不同字幕格式之间转换' },
  '/image/to-video': { title: '图片转视频', desc: '将图片序列合成为视频' },
  '/image/to-gif': { title: '视频转 GIF', desc: '将视频片段转换为 GIF 动图' },
  '/image/gif-optimize': { title: 'GIF 优化', desc: '优化 GIF 文件大小和画质' },
  '/stream/rtmp': { title: 'RTMP 推流', desc: '推送视频流到 RTMP 服务器' },
  '/stream/hls': { title: 'HLS 转换', desc: '将视频转换为 HLS 流格式' },
  '/stream/screen': { title: '录屏推流', desc: '录制屏幕并推流' },
  '/advanced/cmd-builder': { title: 'FFmpeg 命令生成器', desc: '可视化构建 FFmpeg 命令行' },
  '/advanced/batch': { title: '批处理任务', desc: '批量处理多个媒体文件' },
  '/advanced/gpu': { title: 'GPU 编码', desc: '使用硬件加速进行编码' },
  '/advanced/custom': { title: '自定义参数', desc: '使用自定义 FFmpeg 参数进行转码' },
  '/system/settings': { title: '设置', desc: '应用程序设置与偏好' },
  '/system/logs': { title: '日志', desc: '查看 FFmpeg 运行日志' },
  '/system/about': { title: '关于', desc: '关于 FFmpeg UI' },
};

export default function MainLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const currentPage = pageTitles[location.pathname] || { title: 'FFmpeg UI', desc: '' };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <HeaderBar
        title={currentPage.title}
        description={currentPage.desc}
      />
      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Sider
          width={240}
          collapsedWidth={64}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            overflow: 'auto',
            height: '100%',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <Sidebar />
        </Sider>
        <Content
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
