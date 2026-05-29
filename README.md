# FFmpeg UI 🎬

> 一款基于 Electron + React + TypeScript 的现代化 FFmpeg 桌面图形界面工具，告别命令行，轻松处理媒体文件。

## ✨ 功能特性

| 分类 | 功能 | 说明 |
|------|------|------|
| 🎥 **视频处理** | 格式转换 | 支持 MP4、AVI、MKV、MOV、WebM 等常见格式互转 |
| | 视频压缩 | 调整编解码器 / CRF / 码率 / 分辨率，平衡画质与体积 |
| | 视频剪辑 | 截取片段、设置起止时间 |
| | 视频拼接 | 合并多个视频文件 |
| | 视频旋转 | 90°/180°/270° 旋转或水平/垂直翻转 |
| | 提取帧 | 按时间或帧率提取视频帧为图片 |
| | 转 GIF | 将视频片段转为高质量 GIF |
| | 添加水印 | 图片水印与文字水印叠加 |
| 🎵 **音频处理** | 格式转换 | MP3、WAV、FLAC、AAC、OGG 等格式互转 |
| | 音量调整 | 放大/缩小/归一化 |
| | 音频提取 | 从视频中提取音频轨道 |
| | 降噪处理 | 背景噪音消除 |
| | 音频拼接 | 合并多个音频文件 |
| | 背景音乐 | 为视频添加背景音乐 |
| 🖼️ **高级功能** | 批量处理 | 多文件批量执行同一操作 |
| | GPU 加速 | NVENC / AMF / QSV 硬件编码支持 |
| | HLS 转换 | 视频切片为 HLS（m3u8） |
| | 自定义参数 | 自由编辑 FFmpeg 命令行参数 |
| | FFmpeg 命令生成器 | 可视化生成命令行 |
| | GIF 优化 | 优化 GIF 大小与质量 |
| | 图片转视频 | 图片序列合成视频 |
| 📺 **推流** | RTMP 推流 | 实时推送视频流到 RTMP 服务器 |
| | 屏幕录制 | 屏幕内容实时推流 |
| 📁 **字幕** | 添加字幕 | 为视频嵌入字幕轨道 |
| | 字幕转换 | 字幕格式互转（SRT、ASS、VTT） |
| | 字幕提取 | 从视频中提取字幕流 |

## 🖥️ 界面预览

- 无边框窗口设计
- 左侧导航栏快速切换功能
- 实时 FFmpeg 运行状态监控
- 任务队列管理，支持取消
- 深色/浅色主题切换

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **Electron 28** | 桌面应用框架 |
| **React 18** | UI 组件库 |
| **TypeScript** | 类型安全 |
| **Vite 5** | 构建工具 |
| **Ant Design 5** | UI 组件 |
| **vite-plugin-electron** | Electron 集成 |
| **electron-builder** | 应用打包 |

## 📦 快速开始

### 前置要求

- **Node.js** >= 18
- **FFmpeg** + **FFprobe**（需添加到系统 PATH，或通过应用内手动选择路径）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Lyornzen/FFmpeg-GUI.git
cd FFmpeg-GUI

# 安装依赖
npm install

# 启动开发模式（带热重载）
npm run dev

# 代码检查
npm run lint

# 构建生产版本
npm run build

# 打包为可分发安装包（NSIS / DMG / AppImage）
npm run package
```

### 跨平台构建输出

| 平台 | 输出格式 | 路径 |
|------|---------|------|
| Windows | NSIS 安装包 | `release/FFmpeg UI Setup *.exe` |
| macOS | DMG 镜像 | `release/FFmpeg UI *.dmg` |
| Linux | AppImage | `release/FFmpeg UI *.AppImage` |

## 🔧 使用说明

1. **启动应用** — 运行 `npm run dev` 或打开已安装的应用
2. **检测 FFmpeg** — 首页自动检测系统 FFmpeg/FFprobe 状态（支持手动选择路径）
3. **选择文件** — 通过文件对话框或拖拽选择媒体文件
4. **配置参数** — 根据功能页面调整编码参数
5. **执行任务** — 点击开始，实时查看进度与日志

## 📁 项目结构

```
FFmpeg-GUI/
├── electron/              # Electron 主进程
│   ├── main.ts            # 应用入口、窗口管理、FFmpeg 检测
│   ├── preload.ts         # 预加载脚本（contextBridge）
│   ├── ffmpeg-config.ts   # FFmpeg 路径配置
│   ├── logger.ts          # 日志系统
│   └── ipc/
│       └── ffmpeg.ts      # FFmpeg 子进程管理 & IPC 处理
├── src/                   # React 渲染进程
│   ├── main.tsx           # 渲染进程入口
│   ├── App.tsx            # 根组件、路由配置
│   ├── theme.ts           # Ant Design 主题
│   ├── global.css         # 全局样式
│   ├── components/        # 通用组件
│   ├── contexts/          # React Context
│   ├── hooks/             # 自定义 Hooks
│   ├── layouts/           # 布局组件
│   ├── pages/             # 功能页面（27+ 页面）
│   ├── shared/            # 共享 UI 组件
│   └── env.d.ts           # 类型声明
├── release/               # 打包输出目录
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！在提交之前请确保：

1. 代码通过 TypeScript 类型检查（`npm run lint`）
2. 新增功能请保持页面风格的统一
3. FFmpeg 参数变更请确保向后兼容

## 📄 License

MIT
