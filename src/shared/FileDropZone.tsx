import { Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;

interface FileDropZoneProps {
  onFilesAdded: (files: File[]) => void;
  accept?: string;
  hint?: string;
}

export default function FileDropZone({
  onFilesAdded,
  accept = '.mp4,.avi,.mkv,.mov,.wmv,.flv,.webm,.mp3,.wav,.flac,.aac,.ogg',
  hint = '支持 MP4, AVI, MKV, MOV, WMV, FLV, WebM, MP3, WAV, FLAC, AAC, OGG 等格式',
}: FileDropZoneProps) {
  const props: UploadProps = {
    name: 'file',
    multiple: true,
    accept,
    showUploadList: false,
    beforeUpload: (file, fileList) => {
      onFilesAdded(fileList.map((f) => f as unknown as File));
      return false;
    },
  };

  return (
    <Dragger {...props} style={{ height: 180 }}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
      </p>
      <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500, color: '#374151', marginTop: 8, marginBottom: 4 }}>
        点击或拖拽文件到此区域
      </p>
      <p className="ant-upload-hint" style={{ fontSize: 13, color: '#9ca3af' }}>
        {hint}
      </p>
    </Dragger>
  );
}
