import { useNavigate } from 'react-router-dom';
import {
  SettingOutlined,
  QuestionCircleOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Tooltip, Divider } from 'antd';

export default function HeaderBar() {
  const navigate = useNavigate();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="./icon.png"
          alt="FFmpegEasyConfig"
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#111827',
            letterSpacing: '-0.3px',
          }}
        >
          FFmpegEasyConfig
        </span>
      </div>

      {/* Right: Tools */}
      <div
        className="header-no-drag"
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Tooltip title="设置">
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: 18 }} />}
            onClick={() => navigate('/system/settings')}
          />
        </Tooltip>
        <Tooltip title="帮助">
          <Button
            type="text"
            icon={<QuestionCircleOutlined style={{ fontSize: 18 }} />}
            onClick={() => window.electronAPI?.app?.openExternal('https://ffmpeg.org/documentation.html')}
          />
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
