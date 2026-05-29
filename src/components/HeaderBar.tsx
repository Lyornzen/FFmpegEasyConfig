import {
  SettingOutlined,
  QuestionCircleOutlined,
  MinusOutlined,
  BorderOutlined,
  BlockOutlined,
  CloseOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Button, Tooltip, Space, Divider } from 'antd';

interface HeaderBarProps {
  title: string;
  description: string;
}

export default function HeaderBar({ title, description }: HeaderBarProps) {
  const handleMinimize = () => window.electronAPI?.window?.minimize();
  const handleMaximize = () => window.electronAPI?.window?.maximize();
  const handleClose = () => window.electronAPI?.window?.close();

  return (
    <div
      className="header-drag-region"
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Left: Logo — draggable region */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: '#1677ff',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          F
        </div>
        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#111827',
            letterSpacing: '-0.3px',
          }}
        >
          FFmpeg UI
        </span>
      </div>

      {/* Center: Page title — draggable region */}
      <div
        style={{ textAlign: 'center', flex: 1, maxWidth: 480 }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          {description}
        </div>
      </div>

      {/* Right: Tools */}
      <div
        className="header-no-drag"
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Tooltip title="设置">
          <Button type="text" icon={<SettingOutlined style={{ fontSize: 18 }} />} />
        </Tooltip>
        <Tooltip title="帮助">
          <Button type="text" icon={<QuestionCircleOutlined style={{ fontSize: 18 }} />} />
        </Tooltip>
        <Tooltip title="切换主题">
          <Button type="text" icon={<SwapOutlined style={{ fontSize: 18 }} />} />
        </Tooltip>

        <Divider type="vertical" style={{ height: 20, margin: '0 8px' }} />

        <Tooltip title="最小化">
          <button className="window-control-btn" onClick={handleMinimize}>
            <MinusOutlined style={{ fontSize: 16 }} />
          </button>
        </Tooltip>
        <Tooltip title="最大化">
          <button className="window-control-btn" onClick={handleMaximize}>
            <BorderOutlined style={{ fontSize: 14 }} />
          </button>
        </Tooltip>
        <Tooltip title="关闭">
          <button className="window-control-btn close" onClick={handleClose}>
            <CloseOutlined style={{ fontSize: 16 }} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
