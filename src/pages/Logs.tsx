import { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Spin } from 'antd';
import { ReloadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function Logs() {
  const [logContent, setLogContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const content = await window.electronAPI?.app?.getLog();
      setLogContent(content || '(日志为空)');
    } catch {
      setLogContent('无法读取日志文件');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <Card
      title="运行日志"
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadLogs} loading={loading}>
            刷新
          </Button>
        </Space>
      }
    >
      <div
        style={{
          background: '#f8f9fa',
          color: '#374151',
          border: '1px solid #e5e7eb',
          fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
          fontSize: 12,
          lineHeight: 1.7,
          padding: 16,
          borderRadius: 8,
          maxHeight: 'calc(100vh - 300px)',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          logContent || '(暂无日志)'
        )}
      </div>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          日志文件路径: 应用同级目录下的 log.txt · 每次启动追加写入
        </Text>
      </div>
    </Card>
  );
}
