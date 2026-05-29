import { Table, Button, Tag, Space, Tooltip } from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  VideoCameraOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface MediaFile {
  key: string;
  name: string;
  path: string;
  duration: string;
  resolution: string;
  fileSize: string;
  status: 'ready' | 'processing' | 'done' | 'error';
  type: 'video' | 'audio' | 'image';
}

interface FileInfoTableProps {
  files: MediaFile[];
  onRemove: (key: string) => void;
  onPreview?: (file: MediaFile) => void;
}

export default function FileInfoTable({ files, onRemove, onPreview }: FileInfoTableProps) {
  const columns: ColumnsType<MediaFile> = [
    {
      title: '文件',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (name: string, record: MediaFile) => (
        <Space>
          {record.type === 'video' && <VideoCameraOutlined style={{ color: '#1677ff' }} />}
          {record.type === 'audio' && <AudioOutlined style={{ color: '#52c41a' }} />}
          {record.type === 'image' && <FileOutlined style={{ color: '#faad14' }} />}
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      align: 'center',
    },
    {
      title: '分辨率',
      dataIndex: 'resolution',
      key: 'resolution',
      width: 120,
      align: 'center',
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: string) => {
        const map: Record<string, { color: string; text: string }> = {
          ready: { color: 'default', text: '就绪' },
          processing: { color: 'processing', text: '处理中' },
          done: { color: 'success', text: '完成' },
          error: { color: 'error', text: '失败' },
        };
        const s = map[status] || map.ready;
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_: unknown, record: MediaFile) => (
        <Space size={4}>
          {onPreview && (
            <Tooltip title="预览">
              <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => onPreview(record)} />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onRemove(record.key)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={files}
      pagination={false}
      size="middle"
      locale={{ emptyText: '暂无文件，请拖拽文件到上方区域添加' }}
      style={{ marginTop: files.length > 0 ? 16 : 0 }}
    />
  );
}
