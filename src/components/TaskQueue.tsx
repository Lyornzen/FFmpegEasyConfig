import { Card, Table, Progress, Tag, Button, Space } from 'antd';
import { PauseCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface TaskItem {
  key: string;
  name: string;
  inputFile: string;
  outputFile: string;
  progress: number;
  speed: string;
  remaining: string;
  status: 'waiting' | 'processing' | 'done' | 'error';
}

const mockTasks: TaskItem[] = [];

interface TaskQueueProps {
  tasks?: TaskItem[];
  onPause?: (key: string) => void;
  onStop?: (key: string) => void;
}

export default function TaskQueue({
  tasks = mockTasks,
  onPause,
  onStop,
}: TaskQueueProps) {
  const columns: ColumnsType<TaskItem> = [
    {
      title: '任务',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      ellipsis: true,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 240,
      render: (progress: number) => (
        <Progress percent={progress} size="small" strokeColor="#1677ff" />
      ),
    },
    {
      title: '速度',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      align: 'center',
    },
    {
      title: '剩余时间',
      dataIndex: 'remaining',
      key: 'remaining',
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
          waiting: { color: 'default', text: '等待中' },
          processing: { color: 'processing', text: '处理中' },
          done: { color: 'success', text: '已完成' },
          error: { color: 'error', text: '失败' },
        };
        const s = map[status] || map.waiting;
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_: unknown, record: TaskItem) => (
        <Space size={4}>
          {record.status === 'processing' && (
            <>
              <Button
                type="text"
                size="small"
                icon={<PauseCircleOutlined />}
                onClick={() => onPause?.(record.key)}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => onStop?.(record.key)}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <span style={{ fontSize: 15, fontWeight: 600 }}>任务列表</span>
      }
      style={{ marginTop: 24, flexShrink: 0 }}
      bodyStyle={{ padding: '16px 24px' }}
    >

      <Table
        columns={columns}
        dataSource={tasks}
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无任务' }}
      />
    </Card>
  );
}
