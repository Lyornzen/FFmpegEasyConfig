import { ConfigProvider } from 'antd';
import { HashRouter, Routes, Route } from 'react-router-dom';
import theme from './theme';
import { TaskProvider } from './contexts/TaskContext';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import VideoConvert from './pages/VideoConvert';
import VideoClip from './pages/VideoClip';
import VideoMerge from './pages/VideoMerge';
import VideoSplit from './pages/VideoSplit';
import VideoCompress from './pages/VideoCompress';
import VideoExtractFrame from './pages/VideoExtractFrame';
import VideoRotate from './pages/VideoRotate';
import VideoWatermark from './pages/VideoWatermark';
import AudioConvert from './pages/AudioConvert';
import AudioClip from './pages/AudioClip';
import AudioMerge from './pages/AudioMerge';
import AudioExtract from './pages/AudioExtract';
import AudioVolume from './pages/AudioVolume';
import AudioBackground from './pages/AudioBackground';
import AudioDenoise from './pages/AudioDenoise';
import SubtitleAdd from './pages/SubtitleAdd';
import SubtitleExtract from './pages/SubtitleExtract';
import SubtitleConvert from './pages/SubtitleConvert';
import ImageToVideo from './pages/ImageToVideo';
import VideoToGif from './pages/VideoToGif';
import GifOptimize from './pages/GifOptimize';
import RtmpStream from './pages/RtmpStream';
import HlsConvert from './pages/HlsConvert';
import ScreenStream from './pages/ScreenStream';
import FFmpegCmdBuilder from './pages/FFmpegCmdBuilder';
import BatchProcess from './pages/BatchProcess';
import GpuEncode from './pages/GpuEncode';
import CustomParams from './pages/CustomParams';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import About from './pages/About';

function App() {
  return (
    <ConfigProvider theme={theme}>
      <TaskProvider>
        <HashRouter>
          <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="video/convert" element={<VideoConvert />} />
            <Route path="video/clip" element={<VideoClip />} />
            <Route path="video/merge" element={<VideoMerge />} />
            <Route path="video/split" element={<VideoSplit />} />
            <Route path="video/compress" element={<VideoCompress />} />
            <Route path="video/extract-frame" element={<VideoExtractFrame />} />
            <Route path="video/rotate" element={<VideoRotate />} />
            <Route path="video/watermark" element={<VideoWatermark />} />
            <Route path="audio/convert" element={<AudioConvert />} />
            <Route path="audio/clip" element={<AudioClip />} />
            <Route path="audio/merge" element={<AudioMerge />} />
            <Route path="audio/extract" element={<AudioExtract />} />
            <Route path="audio/volume" element={<AudioVolume />} />
            <Route path="audio/background" element={<AudioBackground />} />
            <Route path="audio/denoise" element={<AudioDenoise />} />
            <Route path="subtitle/add" element={<SubtitleAdd />} />
            <Route path="subtitle/extract" element={<SubtitleExtract />} />
            <Route path="subtitle/convert" element={<SubtitleConvert />} />
            <Route path="image/to-video" element={<ImageToVideo />} />
            <Route path="image/to-gif" element={<VideoToGif />} />
            <Route path="image/gif-optimize" element={<GifOptimize />} />
            <Route path="stream/rtmp" element={<RtmpStream />} />
            <Route path="stream/hls" element={<HlsConvert />} />
            <Route path="stream/screen" element={<ScreenStream />} />
            <Route path="advanced/cmd-builder" element={<FFmpegCmdBuilder />} />
            <Route path="advanced/batch" element={<BatchProcess />} />
            <Route path="advanced/gpu" element={<GpuEncode />} />
            <Route path="advanced/custom" element={<CustomParams />} />
            <Route path="system/settings" element={<Settings />} />
            <Route path="system/logs" element={<Logs />} />
            <Route path="system/about" element={<About />} />
          </Route>
          </Routes>
        </HashRouter>
      </TaskProvider>
    </ConfigProvider>
  );
}

export default App;
