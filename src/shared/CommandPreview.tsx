import { useState } from 'react';
import { Tooltip, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface CommandPreviewProps {
  command: string;
}

export default function CommandPreview({ command }: CommandPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  if (!command) {
    return null;
  }

  return (
    <div className="code-block">
      <Tooltip title={copied ? '已复制' : '复制命令'}>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? <CheckOutlined /> : <CopyOutlined />}
          <span style={{ marginLeft: 4 }}>{copied ? '已复制' : '复制'}</span>
        </button>
      </Tooltip>
      <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{command}</code>
    </div>
  );
}
