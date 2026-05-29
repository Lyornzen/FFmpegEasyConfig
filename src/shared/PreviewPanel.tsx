import { useRef } from 'react';
import { Card, Descriptions, Tag, Empty } from 'antd';
import type { MediaFile } from './FileInfoTable';

interface PreviewPanelProps {
  file: MediaFile | null;
}

function formatPathForVideo(filePath: string): string {
  // Use the custom local-file:// protocol registered in main process.
  // Encode the ENTIRE path so the browser URL parser doesn't mangle
  // the drive letter colon (D:) or spaces in the path.
  const normalized = filePath.replace(/\\/g, '/');
  return `local-file://${encodeURIComponent(normalized)}`;
}

export default function PreviewPanel({ file }: PreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!file) {
    return (
      <Card
        title="预览"
        style={{ width: 420, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 0 }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="选择一个文件以预览"
        />
      </Card>
    );
  }

  return (
    <Card
      title="预览"
      style={{ width: 420, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 0 }}
    >
      {/* Video Preview Player */}
      <div
        style={{
          width: '100%',
          background: '#1e1e1e',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        {file.type === 'video' ? (
          <video
            ref={videoRef}
            controls
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 12,
            }}
            src={file.path ? formatPathForVideo(file.path) : undefined}
          >
            您的浏览器不支持视频播放
          </video>
        ) : file.type === 'audio' ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <audio
              controls
              style={{ width: '100%' }}
              src={file.path ? formatPathForVideo(file.path) : undefined}
            />
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🖼️</div>
            <div style={{ fontSize: 14 }}>图片预览不可用</div>
          </div>
        )}
      </div>

      {/* File Info */}
      <Descriptions column={1} size="small" colon={false} labelStyle={{ color: '#6b7280', fontSize: 12 }}>
        <Descriptions.Item label="文件名">{file.name}</Descriptions.Item>
        <Descriptions.Item label="类型">
          <Tag>{file.type === 'video' ? '视频' : file.type === 'audio' ? '音频' : '图片'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="时长">{file.duration || '—'}</Descriptions.Item>
        <Descriptions.Item label="分辨率">{file.resolution || '—'}</Descriptions.Item>
        <Descriptions.Item label="大小">{file.fileSize}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
