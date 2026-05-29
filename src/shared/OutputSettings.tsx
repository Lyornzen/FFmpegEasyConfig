import { Card, Tabs, Form, Select, Input, Slider, Switch, InputNumber, Row, Col, Collapse } from 'antd';
import { SettingOutlined, VideoCameraOutlined, AudioOutlined, ExperimentOutlined } from '@ant-design/icons';

const { Option } = Select;

export interface OutputSettingsValues {
  // Basic
  outputFormat: string;
  videoCodec: string;
  audioCodec: string;
  outputDir: string;
  preset: string;
  resolution: string;
  bitrate: string;
  outputName: string;
  // Video
  frameRate: number;
  crf: number;
  gop: number;
  profile: string;
  pixelFormat: string;
  colorSpace: string;
  deinterlace: boolean;
  videoFilter: string;
  // Audio
  audioChannels: string;
  sampleRate: string;
  volume: number;
  audioBitrate: string;
  denoise: boolean;
  fadeIn: number;
  fadeOut: number;
  audioFilter: string;
  // Advanced
  gpuAccel: boolean;
  hardwareEncoder: string;
  multiThread: boolean;
  logLevel: string;
  customArgs: string;
}

interface OutputSettingsProps {
  values: OutputSettingsValues;
  onChange: (values: Partial<OutputSettingsValues>) => void;
}

export default function OutputSettings({ values, onChange }: OutputSettingsProps) {
  const handleChange = (key: keyof OutputSettingsValues, value: unknown) => {
    onChange({ [key]: value });
  };

  const basicTab = (
    <Form layout="vertical" size="middle">
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="输出格式">
            <Select value={values.outputFormat} onChange={(v) => handleChange('outputFormat', v)}>
              <Option value="mp4">MP4</Option>
              <Option value="avi">AVI</Option>
              <Option value="mkv">MKV</Option>
              <Option value="mov">MOV</Option>
              <Option value="webm">WebM</Option>
              <Option value="flv">FLV</Option>
              <Option value="wmv">WMV</Option>
            </Select>
          </Form.Item>
          <Form.Item label="视频编码器">
            <Select value={values.videoCodec} onChange={(v) => handleChange('videoCodec', v)}>
              <Option value="libx264">H.264 (libx264)</Option>
              <Option value="libx265">H.265 / HEVC (libx265)</Option>
              <Option value="libvpx-vp9">VP9 (libvpx-vp9)</Option>
              <Option value="libaom-av1">AV1 (libaom-av1)</Option>
              <Option value="h264_nvenc">H.264 NVENC</Option>
              <Option value="hevc_nvenc">HEVC NVENC</Option>
              <Option value="copy">复制流 (copy)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="音频编码器">
            <Select value={values.audioCodec} onChange={(v) => handleChange('audioCodec', v)}>
              <Option value="aac">AAC</Option>
              <Option value="libmp3lame">MP3 (libmp3lame)</Option>
              <Option value="libopus">Opus (libopus)</Option>
              <Option value="libvorbis">Vorbis (libvorbis)</Option>
              <Option value="flac">FLAC</Option>
              <Option value="copy">复制流 (copy)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="输出目录">
            <Input
              value={values.outputDir}
              placeholder="选择输出目录..."
              onChange={(e) => handleChange('outputDir', e.target.value)}
              addonAfter={
                <span
                  style={{ cursor: 'pointer', color: '#1677ff' }}
                  onClick={async () => {
                    const dir = await window.electronAPI?.file?.openDirDialog();
                    if (dir) {
                      onChange({ outputDir: dir });
                    }
                  }}
                >
                  浏览
                </span>
              }
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="预设 Preset">
            <Select value={values.preset} onChange={(v) => handleChange('preset', v)}>
              <Option value="ultrafast">ultrafast</Option>
              <Option value="superfast">superfast</Option>
              <Option value="veryfast">veryfast</Option>
              <Option value="faster">faster</Option>
              <Option value="fast">fast</Option>
              <Option value="medium">medium</Option>
              <Option value="slow">slow</Option>
              <Option value="slower">slower</Option>
              <Option value="veryslow">veryslow</Option>
            </Select>
          </Form.Item>
          <Form.Item label="分辨率">
            <Select value={values.resolution} onChange={(v) => handleChange('resolution', v)}>
              <Option value="">保持原始</Option>
              <Option value="3840:2160">4K (3840×2160)</Option>
              <Option value="2560:1440">2K (2560×1440)</Option>
              <Option value="1920:1080">1080p (1920×1080)</Option>
              <Option value="1280:720">720p (1280×720)</Option>
              <Option value="854:480">480p (854×480)</Option>
              <Option value="640:360">360p (640×360)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="比特率">
            <Select value={values.bitrate} onChange={(v) => handleChange('bitrate', v)}>
              <Option value="">自动</Option>
              <Option value="50M">50 Mbps</Option>
              <Option value="20M">20 Mbps</Option>
              <Option value="10M">10 Mbps</Option>
              <Option value="8M">8 Mbps</Option>
              <Option value="5M">5 Mbps</Option>
              <Option value="2M">2 Mbps</Option>
              <Option value="1M">1 Mbps</Option>
            </Select>
          </Form.Item>
          <Form.Item label="输出文件名">
            <Input
              value={values.outputName}
              placeholder="output"
              onChange={(e) => handleChange('outputName', e.target.value)}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  const videoTab = (
    <Form layout="vertical" size="middle">
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="编码器">
            <Select value={values.videoCodec} onChange={(v) => handleChange('videoCodec', v)}>
              <Option value="libx264">H.264 (libx264)</Option>
              <Option value="libx265">H.265 / HEVC (libx265)</Option>
              <Option value="libvpx-vp9">VP9 (libvpx-vp9)</Option>
              <Option value="libaom-av1">AV1 (libaom-av1)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="帧率 FPS">
            <Select value={values.frameRate} onChange={(v) => handleChange('frameRate', v)}>
              <Option value={0}>保持原始</Option>
              <Option value={60}>60 fps</Option>
              <Option value={30}>30 fps</Option>
              <Option value={25}>25 fps</Option>
              <Option value={24}>24 fps</Option>
              <Option value={15}>15 fps</Option>
            </Select>
          </Form.Item>
          <Form.Item label="CRF (质量)">
            <Slider
              min={0}
              max={51}
              value={values.crf}
              onChange={(v) => handleChange('crf', v)}
              marks={{ 0: '无损', 18: '高质量', 23: '默认', 28: '中等', 51: '最低' }}
            />
          </Form.Item>
          <Form.Item label="GOP 大小">
            <InputNumber
              min={1}
              max={600}
              value={values.gop}
              onChange={(v) => handleChange('gop', v ?? 0)}
              style={{ width: '100%' }}
              placeholder="关键帧间隔"
            />
          </Form.Item>
          <Form.Item label="Profile">
            <Select value={values.profile} onChange={(v) => handleChange('profile', v)}>
              <Option value="">自动</Option>
              <Option value="baseline">Baseline</Option>
              <Option value="main">Main</Option>
              <Option value="high">High</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="像素格式">
            <Select value={values.pixelFormat} onChange={(v) => handleChange('pixelFormat', v)}>
              <Option value="">自动</Option>
              <Option value="yuv420p">yuv420p</Option>
              <Option value="yuv422p">yuv422p</Option>
              <Option value="yuv444p">yuv444p</Option>
              <Option value="rgb24">rgb24</Option>
              <Option value="yuv420p10le">yuv420p10le (10-bit)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="色彩空间">
            <Select value={values.colorSpace} onChange={(v) => handleChange('colorSpace', v)}>
              <Option value="">自动</Option>
              <Option value="bt709">BT.709</Option>
              <Option value="bt2020">BT.2020</Option>
              <Option value="smpte170m">SMPTE 170M</Option>
            </Select>
          </Form.Item>
          <Form.Item label="去隔行">
            <Switch
              checked={values.deinterlace}
              onChange={(v) => handleChange('deinterlace', v)}
            />
          </Form.Item>
          <Form.Item label="视频滤镜">
            <Input.TextArea
              rows={3}
              value={values.videoFilter}
              onChange={(e) => handleChange('videoFilter', e.target.value)}
              placeholder="例如: eq=brightness=0.05:contrast=1.1"
            />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ marginTop: 8 }}>
        <Collapse
          ghost
          items={[
            {
              key: 'advanced-video',
              label: '高级视频选项',
              children: (
                <div style={{ paddingTop: 8 }}>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label="B-Frames" style={{ marginBottom: 16 }}>
                        <InputNumber min={0} max={16} style={{ width: '100%' }} placeholder="自动" />
                      </Form.Item>
                      <Form.Item label="参考帧数" style={{ marginBottom: 0 }}>
                        <InputNumber min={1} max={16} style={{ width: '100%' }} placeholder="自动" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Tune" style={{ marginBottom: 0 }}>
                        <Select defaultValue="">
                          <Option value="">无</Option>
                          <Option value="film">Film</Option>
                          <Option value="animation">Animation</Option>
                          <Option value="grain">Grain</Option>
                          <Option value="stillimage">Still Image</Option>
                          <Option value="fastdecode">Fast Decode</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Form>
  );

  const audioTab = (
    <Form layout="vertical" size="middle">
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="音频编码器">
            <Select value={values.audioCodec} onChange={(v) => handleChange('audioCodec', v)}>
              <Option value="aac">AAC</Option>
              <Option value="libmp3lame">MP3</Option>
              <Option value="libopus">Opus</Option>
              <Option value="flac">FLAC</Option>
            </Select>
          </Form.Item>
          <Form.Item label="声道">
            <Select value={values.audioChannels} onChange={(v) => handleChange('audioChannels', v)}>
              <Option value="">保持原始</Option>
              <Option value="mono">单声道 (Mono)</Option>
              <Option value="stereo">立体声 (Stereo)</Option>
              <Option value="5.1">5.1 环绕声</Option>
              <Option value="7.1">7.1 环绕声</Option>
            </Select>
          </Form.Item>
          <Form.Item label="采样率">
            <Select value={values.sampleRate} onChange={(v) => handleChange('sampleRate', v)}>
              <Option value="">保持原始</Option>
              <Option value="8000">8000 Hz</Option>
              <Option value="22050">22050 Hz</Option>
              <Option value="44100">44100 Hz</Option>
              <Option value="48000">48000 Hz</Option>
              <Option value="96000">96000 Hz</Option>
            </Select>
          </Form.Item>
          <Form.Item label="音量">
            <Slider
              min={0}
              max={300}
              value={values.volume}
              onChange={(v) => handleChange('volume', v)}
              marks={{ 0: '0%', 100: '100%', 200: '200%', 300: '300%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="音频比特率">
            <Select value={values.audioBitrate} onChange={(v) => handleChange('audioBitrate', v)}>
              <Option value="">自动</Option>
              <Option value="320k">320 kbps</Option>
              <Option value="256k">256 kbps</Option>
              <Option value="192k">192 kbps</Option>
              <Option value="128k">128 kbps</Option>
              <Option value="96k">96 kbps</Option>
              <Option value="64k">64 kbps</Option>
            </Select>
          </Form.Item>
          <Form.Item label="降噪">
            <Switch checked={values.denoise} onChange={(v) => handleChange('denoise', v)} />
          </Form.Item>
          <Form.Item label="淡入 (秒)">
            <InputNumber
              min={0}
              max={30}
              step={0.1}
              value={values.fadeIn}
              onChange={(v) => handleChange('fadeIn', v ?? 0)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="淡出 (秒)">
            <InputNumber
              min={0}
              max={30}
              step={0.1}
              value={values.fadeOut}
              onChange={(v) => handleChange('fadeOut', v ?? 0)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="音频滤镜">
            <Input.TextArea
              rows={3}
              value={values.audioFilter}
              onChange={(e) => handleChange('audioFilter', e.target.value)}
              placeholder="例如: loudnorm, equalizer, compand"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  const advancedTab = (
    <Form layout="vertical" size="middle">
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="GPU 硬件加速">
            <Switch checked={values.gpuAccel} onChange={(v) => handleChange('gpuAccel', v)} />
          </Form.Item>
          <Form.Item label="硬件编码器">
            <Select
              value={values.hardwareEncoder}
              onChange={(v) => handleChange('hardwareEncoder', v)}
              disabled={!values.gpuAccel}
            >
              <Option value="">自动选择</Option>
              <Option value="h264_nvenc">NVIDIA NVENC H.264</Option>
              <Option value="hevc_nvenc">NVIDIA NVENC HEVC</Option>
              <Option value="h264_amf">AMD AMF H.264</Option>
              <Option value="hevc_amf">AMD AMF HEVC</Option>
              <Option value="h264_qsv">Intel QSV H.264</Option>
              <Option value="hevc_qsv">Intel QSV HEVC</Option>
              <Option value="h264_videotoolbox">Apple VideoToolbox H.264</Option>
            </Select>
          </Form.Item>
          <Form.Item label="多线程">
            <Switch checked={values.multiThread} onChange={(v) => handleChange('multiThread', v)} />
          </Form.Item>
          <Form.Item label="日志等级">
            <Select value={values.logLevel} onChange={(v) => handleChange('logLevel', v)}>
              <Option value="quiet">quiet</Option>
              <Option value="panic">panic</Option>
              <Option value="fatal">fatal</Option>
              <Option value="error">error</Option>
              <Option value="warning">warning</Option>
              <Option value="info">info</Option>
              <Option value="verbose">verbose</Option>
              <Option value="debug">debug</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="自定义 FFmpeg 参数">
            <Input.TextArea
              rows={6}
              value={values.customArgs}
              onChange={(e) => handleChange('customArgs', e.target.value)}
              placeholder={`例如:\n-ss 00:00:10\n-t 00:01:00\n-filter_complex "overlay=10:10"`}
              style={{ fontFamily: "'Cascadia Code', 'Fira Code', monospace", fontSize: 13 }}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  return (
    <Card
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined />
          <span>输出设置</span>
        </span>
      }
    >
      <Tabs
        defaultActiveKey="basic"
        style={{ marginTop: 4 }}
        items={[
          { key: 'basic', label: '基本设置', icon: <SettingOutlined />,
            children: <div className="compact-form" style={{ padding: '12px 0 8px' }}>{basicTab}</div> },
          { key: 'video', label: '视频参数', icon: <VideoCameraOutlined />,
            children: <div className="compact-form" style={{ padding: '12px 0 8px' }}>{videoTab}</div> },
          { key: 'audio', label: '音频参数', icon: <AudioOutlined />,
            children: <div className="compact-form" style={{ padding: '12px 0 8px' }}>{audioTab}</div> },
          { key: 'advanced', label: '高级设置', icon: <ExperimentOutlined />,
            children: <div className="compact-form" style={{ padding: '12px 0 8px' }}>{advancedTab}</div> },
        ]}
      />
    </Card>
  );
}
