/**
 * renderer.js — FFmpeg GUI 渲染进程
 *
 * 职责：
 *  - 侧边栏导航（4 个一级菜单 + 15 个二级工具）
 *  - 动态表单渲染（下拉预设 + 自定义输入）
 *  - FFmpeg 命令构建与预览
 *  - 通过 preload 暴露的 window.electronAPI 与主进程通信
 *  - 深色/浅色主题切换
 *  - 实时日志与进度展示
 */

// ================================================================
//  导航树定义
// ================================================================

const NAV_TREE = [
  {
    id: 'video',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    label: '视频处理',
    items: [
      { id: 'video-cut',       label: '视频裁剪' },
      { id: 'video-transcode', label: '视频转码' },
      { id: 'video-resize',    label: '调整分辨率' },
      { id: 'video-compress',  label: '压缩视频' },
    ],
  },
  {
    id: 'audio',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    label: '音频分离与替换',
    items: [
      { id: 'audio-extract',  label: '提取音频' },
      { id: 'audio-replace',  label: '替换音轨' },
      { id: 'audio-mute',     label: '静音视频' },
    ],
  },
  {
    id: 'audioproc',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    label: '音频处理',
    items: [
      { id: 'audioproc-transcode', label: '音频转码' },
      { id: 'audioproc-cut',       label: '音频裁剪' },
      { id: 'audioproc-volume',    label: '调整音量' },
      { id: 'audioproc-merge',     label: '合并音频' },
    ],
  },
  {
    id: 'tools',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    label: '其他工具',
    items: [
      { id: 'tools-info', label: '查看媒体信息' },
      { id: 'tools-gif',  label: '生成 GIF' },
    ],
  },
  {
    id: 'tasks',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    label: '任务',
    items: [
      { id: 'task-list', label: '任务列表' },
    ],
  },
];

// ================================================================
//  工具参数配置（每个工具定义其表单字段 + 命令构建函数）
// ================================================================

/**
 * 参数类型说明：
 *  - file       文件选择器（输入）
 *  - fileOut    文件选择器（输出）
 *  - select     下拉选择
 *  - combo      下拉预设 + 可编辑文本框
 *  - text       纯文本输入
 *  - number     数字输入
 *
 *  每个参数对象:
 *    id          字段 key
 *    label       标签文字
 *    type        控件类型
 *    options     下拉选项 [{value, label}]（select / combo 类型）
 *    placeholder 占位提示
 *    defaultValue
 *    required    是否必填
 */

const TOOLS = {

  // ==================== 模块1: 视频处理 ====================

  'video-cut': {
    title: '视频裁剪',
    description: '按时间或帧范围裁剪视频片段，支持快速无损和精确重编码两种模式。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'cutMode',    label: '裁剪模式', type: 'select', required: true, options: [
        { value: 'time-duration', label: '按时间段裁剪 (起始 + 持续时间)' },
        { value: 'time-startend', label: '按起始/结束时间裁剪' },
        { value: 'frame',         label: '按帧范围裁剪' },
      ]},
      { id: 'startTime',  label: '起始时间', type: 'text', placeholder: '00:00:05 或 5', defaultValue: '00:00:00' },
      { id: 'endValue',   label: '持续时间 / 结束时间 / 起始帧', type: 'text', placeholder: '00:00:30 或 30', defaultValue: '00:00:10' },
      { id: 'endFrame',   label: '结束帧', type: 'text', placeholder: '例如 300', defaultValue: '' },
      { id: 'cutMethod',  label: '裁剪方式', type: 'select', options: [
        { value: 'fast',    label: '保持原始编码 — 快速裁剪（需关键帧对齐）' },
        { value: 'precise', label: '精确裁剪 — 重新编码，逐帧精确' },
      ]},
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const args = [];
      const method = params.cutMethod || 'precise';
      const mode = params.cutMode || 'time-duration';

      if (method !== 'fast') {
        // 精确模式不加 -c copy
      }

      if (mode === 'time-duration') {
        args.push('-ss', params.startTime || '00:00:00');
        args.push('-t', params.endValue || '00:00:10');
        if (method === 'fast') args.push('-c', 'copy');
      } else if (mode === 'time-startend') {
        args.push('-ss', params.startTime || '00:00:00');
        args.push('-to', params.endValue || '00:00:10');
        if (method === 'fast') args.push('-c', 'copy');
      } else if (mode === 'frame') {
        const sf = params.endValue || '0';
        const ef = params.endFrame || '100';
        args.push('-vf', `select=between(n\\,${sf}\\,${ef}),setpts=N/FRAME_RATE/TB`);
        args.push('-af', 'aselect=between(n\\,${sf}\\,${ef}),asetpts=N/SR/TB');
      }

      return args;
    },
  },

  'video-transcode': {
    title: '视频转码',
    description: '将视频转换为不同格式和编码，支持 H.264/H.265/VP9/GIF 等多种输出。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'format',     label: '输出格式', type: 'select', required: true, options: [
        { value: 'mp4-h264',  label: 'MP4 (H.264 / AAC) — 最通用格式' },
        { value: 'mp4-h265',  label: 'MP4 (H.265 / AAC) — 高压缩率，体积更小' },
        { value: 'mkv-h264',  label: 'MKV (H.264 / AAC) — 支持多音轨字幕' },
        { value: 'avi',       label: 'AVI (MPEG-4 / MP3) — 老旧设备兼容' },
        { value: 'mov',       label: 'MOV (H.264 / PCM) — 苹果系编辑用' },
        { value: 'webm',      label: 'WEBM (VP9 / Opus) — 网页视频专用' },
        { value: 'gif',       label: 'GIF 动图格式' },
      ]},
      { id: 'extraArgs',  label: '额外参数', type: 'text', placeholder: '可选的额外 ffmpeg 参数' },
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const fmt = params.format || 'mp4-h264';
      const maps = {
        'mp4-h264': ['-c:v', 'libx264', '-c:a', 'aac'],
        'mp4-h265': ['-c:v', 'libx265', '-c:a', 'aac'],
        'mkv-h264': ['-c:v', 'libx264', '-c:a', 'aac'],
        'avi':      ['-c:v', 'mpeg4', '-c:a', 'mp3'],
        'mov':      ['-c:v', 'libx264', '-c:a', 'pcm_s16le'],
        'webm':     ['-c:v', 'libvpx-vp9', '-c:a', 'libopus'],
        'gif':      ['-vf', 'fps=10,scale=480:-1'],
      };
      return maps[fmt] || maps['mp4-h264'];
    },
  },

  'video-resize': {
    title: '调整分辨率',
    description: '改变视频分辨率，支持预设尺寸、按宽度/高度自动适配和自定义尺寸。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'resolution', label: '目标分辨率', type: 'combo', required: true, options: [
        { value: 'original',   label: '原始尺寸 — 保持不变' },
        { value: '1920:1080',  label: '1080p (全高清) — 1920×1080' },
        { value: '1280:720',   label: '720p (高清) — 1280×720' },
        { value: '854:480',    label: '480p (标清) — 854×480' },
        { value: '640:360',    label: '360p (低清) — 640×360' },
        { value: '1080:1920',  label: '竖屏 9:16 — 1080×1920' },
        { value: '1080:1080',  label: '正方形 1:1 — 1080×1080' },
        { value: '1280:-2',    label: '仅限宽度（自动高度）' },
        { value: '-2:720',     label: '仅限高度（自动宽度）' },
        { value: 'custom',     label: '自定义尺寸' },
      ], defaultValue: 'original' },
      { id: 'customRes',  label: '自定义 W:H', type: 'text', placeholder: '例如 1920:1080' },
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const res = params.resolution || 'original';
      let scaleVal = res;
      if (res === 'original') return [];  // 不加 -vf
      if (res === 'custom') scaleVal = params.customRes || '1920:1080';
      return ['-vf', `scale=${scaleVal}`];
    },
  },

  'video-compress': {
    title: '压缩视频',
    description: '通过 CRF 或固定码率压缩视频，在画质和文件大小之间取得平衡。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'compressMode', label: '压缩模式', type: 'select', required: true, options: [
        { value: 'crf18',   label: '高质量优先 (CRF 18) — 画质好，体积适中' },
        { value: 'crf23',   label: '平衡模式 (CRF 23) — 默认推荐' },
        { value: 'crf28',   label: '小体积优先 (CRF 28) — 体积小，画质一般' },
        { value: 'crf32',   label: '极限压缩 (CRF 32) — 体积极小，画质较差' },
        { value: 'br1m',    label: '固定码率 1 Mbps — 精确控制文件大小' },
        { value: 'br2.5m',  label: '固定码率 2.5 Mbps — 网络高清标准' },
        { value: 'br5m',    label: '固定码率 5 Mbps — 本地存档用' },
        { value: 'audioOnly', label: '保持原编码仅压缩音频' },
      ]},
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const mode = params.compressMode || 'crf23';
      const map = {
        crf18: ['-c:v', 'libx264', '-crf', '18', '-preset', 'medium'],
        crf23: ['-c:v', 'libx264', '-crf', '23', '-preset', 'medium'],
        crf28: ['-c:v', 'libx264', '-crf', '28', '-preset', 'medium'],
        crf32: ['-c:v', 'libx264', '-crf', '32', '-preset', 'veryslow'],
        br1m:  ['-c:v', 'libx264', '-b:v', '1M', '-bufsize', '2M'],
        'br2.5m': ['-c:v', 'libx264', '-b:v', '2.5M', '-bufsize', '5M'],
        br5m:  ['-c:v', 'libx264', '-b:v', '5M', '-bufsize', '10M'],
        audioOnly: ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k'],
      };
      return map[mode] || map.crf23;
    },
  },

  // ==================== 模块2: 音频分离与替换 ====================

  'audio-extract': {
    title: '提取音频',
    description: '从视频中提取音频轨道，支持 MP3/AAC/FLAC/WAV/Opus 等多种格式。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'audioFormat', label: '音频格式', type: 'select', required: true, options: [
        { value: 'mp3-320',  label: 'MP3 (高品质) — 320 kbps' },
        { value: 'mp3-128',  label: 'MP3 (标准) — 128 kbps' },
        { value: 'aac-256',  label: 'AAC (高品质) — 256 kbps' },
        { value: 'aac-128',  label: 'AAC (标准) — 128 kbps' },
        { value: 'flac',     label: 'FLAC (无损)' },
        { value: 'wav',      label: 'WAV (无损) — PCM' },
        { value: 'opus',     label: 'Opus (网页用) — 96 kbps' },
        { value: 'copy',     label: '保持原始音频格式 — 原样提取' },
      ]},
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const fmt = params.audioFormat || 'mp3-128';
      const map = {
        'mp3-320': ['-vn', '-c:a', 'libmp3lame', '-b:a', '320k'],
        'mp3-128': ['-vn', '-c:a', 'libmp3lame', '-b:a', '128k'],
        'aac-256': ['-vn', '-c:a', 'aac', '-b:a', '256k'],
        'aac-128': ['-vn', '-c:a', 'aac', '-b:a', '128k'],
        'flac':    ['-vn', '-c:a', 'flac'],
        'wav':     ['-vn', '-c:a', 'pcm_s16le'],
        'opus':    ['-vn', '-c:a', 'libopus', '-b:a', '96k'],
        'copy':    ['-vn', '-c:a', 'copy'],
      };
      return map[fmt] || map['mp3-128'];
    },
  },

  'audio-replace': {
    title: '替换音轨',
    description: '用外部音频文件替换或添加视频的音轨，支持延迟调整。',
    params: [
      { id: 'inputVideo', label: '输入视频', type: 'file', required: true },
      { id: 'inputAudio', label: '新音频文件', type: 'file', required: true },
      { id: 'replaceMode', label: '替换模式', type: 'select', options: [
        { value: 'replace', label: '替换为新音频 — 丢弃原视频所有音轨' },
        { value: 'add',     label: '添加为第二音轨 — 保留原音轨，新增音轨' },
        { value: 'mute',    label: '静音处理 — 删除所有音轨' },
      ]},
      { id: 'audioDelay', label: '音频延迟 (秒)', type: 'text', placeholder: '正数=延迟, 负数=提前, 例如 1.5 或 -0.5' },
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params, _formValues, inputFiles) {
      const mode = params.replaceMode || 'replace';
      const audioInput = inputFiles?.inputAudio;

      if (mode === 'mute') {
        return { args: ['-an'], extraInputs: [] };
      }

      const delay = parseFloat(params.audioDelay);
      const delayArgs = (!isNaN(delay) && delay !== 0) ? ['-itsoffset', String(delay)] : [];

      if (mode === 'add') {
        // -map 0 -map 1:a
        return {
          extraInputs: audioInput ? [...delayArgs, '-i', audioInput] : [],
          args: ['-map', '0', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac'],
        };
      }

      // replace: -map 0:v -map 1:a
      return {
        extraInputs: audioInput ? [...delayArgs, '-i', audioInput] : [],
        args: ['-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac'],
      };
    },
  },

  'audio-mute': {
    title: '静音视频',
    description: '移除视频音轨或将其设为零音量。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'muteMode',   label: '静音方式', type: 'select', options: [
        { value: 'remove', label: '完全静音 — 删除所有音轨' },
        { value: 'zero',   label: '保留音轨但设为零音量 — 音轨存在但无声' },
      ]},
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const mode = params.muteMode || 'remove';
      return mode === 'zero' ? ['-af', 'volume=0'] : ['-an'];
    },
  },

  // ==================== 模块3: 音频处理 ====================

  'audioproc-transcode': {
    title: '音频转码',
    description: '将音频文件转换为不同格式，支持 MP3/AAC/FLAC/WAV/Opus。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'audioFormat', label: '输出格式', type: 'select', required: true, options: [
        { value: 'mp3-320',  label: 'MP3 (320k) — 高品质' },
        { value: 'mp3-128',  label: 'MP3 (128k) — 标准' },
        { value: 'aac-256',  label: 'AAC (256k) — 高品质' },
        { value: 'aac-128',  label: 'AAC (128k) — 标准' },
        { value: 'flac',     label: 'FLAC — 无损压缩' },
        { value: 'wav',      label: 'WAV — 未压缩无损' },
        { value: 'opus',     label: 'Opus — 网页流式' },
        { value: 'copy',     label: '保持原始编码 — 仅改容器' },
      ]},
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const fmt = params.audioFormat || 'mp3-128';
      const map = {
        'mp3-320': ['-c:a', 'libmp3lame', '-b:a', '320k'],
        'mp3-128': ['-c:a', 'libmp3lame', '-b:a', '128k'],
        'aac-256': ['-c:a', 'aac', '-b:a', '256k'],
        'aac-128': ['-c:a', 'aac', '-b:a', '128k'],
        'flac':    ['-c:a', 'flac'],
        'wav':     ['-c:a', 'pcm_s16le'],
        'opus':    ['-c:a', 'libopus', '-b:a', '96k'],
        'copy':    ['-c:a', 'copy'],
      };
      return map[fmt] || map['mp3-128'];
    },
  },

  'audioproc-cut': {
    title: '音频裁剪',
    description: '裁剪音频片段，支持快速无损和精确重编码两种模式。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'cutMode',    label: '裁剪模式', type: 'select', required: true, options: [
        { value: 'duration', label: '按时间裁剪 — 指定开始时间和持续时间' },
        { value: 'startend', label: '按起始结束裁剪 — 指定开始时间和结束时间' },
      ]},
      { id: 'startTime',  label: '起始时间', type: 'text', placeholder: '00:00:05 或 5', defaultValue: '00:00:00' },
      { id: 'endValue',   label: '持续时间 / 结束时间', type: 'text', placeholder: '00:00:30 或 30', defaultValue: '00:00:10' },
      { id: 'cutMethod',  label: '裁剪方式', type: 'select', options: [
        { value: 'fast',    label: '无损裁剪 — 不重新编码，快速但不够精确' },
        { value: 'precise', label: '精确裁剪 — 重新编码，逐帧精确' },
      ]},
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const args = [];
      if (params.cutMode === 'duration') {
        args.push('-ss', params.startTime || '00:00:00');
        args.push('-t', params.endValue || '00:00:10');
      } else {
        args.push('-ss', params.startTime || '00:00:00');
        args.push('-to', params.endValue || '00:00:10');
      }
      if (params.cutMethod === 'fast') {
        args.push('-c', 'copy');
      }
      return args;
    },
  },

  'audioproc-volume': {
    title: '调整音量',
    description: '调整音频文件的音量大小，支持预设倍数和自定义值。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'volumeLevel', label: '音量倍数', type: 'combo', required: true, options: [
        { value: '0.5',    label: '降低一半 — 0.5×' },
        { value: '1.0',    label: '保持不变 — 1.0× (不加滤镜)' },
        { value: '1.5',    label: '轻微提高 — 1.5×' },
        { value: '2.0',    label: '提高一倍 — 2.0×' },
        { value: '3.0',    label: '提高两倍 — 3.0×' },
        { value: 'loudnorm', label: '最大化不失真 — 自动响度标准化' },
        { value: 'custom', label: '自定义倍数' },
      ], defaultValue: '1.0' },
      { id: 'customVolume', label: '自定义倍数', type: 'text', placeholder: '例如 0.8 或 1.2' },
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const level = params.volumeLevel || '1.0';
      if (level === '1.0') return [];
      if (level === 'loudnorm') return ['-af', 'volume=1.0,loudnorm=I=-16:LRA=11:TP=-1.5'];
      const val = level === 'custom' ? (params.customVolume || '1.0') : level;
      return ['-af', `volume=${val}`];
    },
  },

  'audioproc-merge': {
    title: '合并音频',
    description: '将两个音频文件拼接或混音叠加。',
    params: [
      { id: 'inputFileA', label: '音频 A', type: 'file', required: true },
      { id: 'inputFileB', label: '音频 B', type: 'file', required: true },
      { id: 'mergeMode',  label: '合并模式', type: 'select', required: true, options: [
        { value: 'concat',  label: '首尾拼接 — 音频 A 接音频 B' },
        { value: 'mix',     label: '混音叠加 — 两音频同时播放' },
        { value: 'ducking', label: '混音并降低背景音 — 主音轨保持 / 背景音降低' },
      ]},
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params, _formValues, inputFiles) {
      const mode = params.mergeMode || 'concat';
      if (mode === 'concat') {
        return {
          extraInputs: [],
          args: ['-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1'],
        };
      }
      if (mode === 'mix') {
        return {
          extraInputs: [],
          args: ['-filter_complex', 'amix=inputs=2:duration=longest'],
        };
      }
      // ducking
      return {
        extraInputs: [],
        args: ['-filter_complex', '[0:a]volume=1.0[a0];[1:a]volume=0.3[a1];[a0][a1]amix=inputs=2'],
      };
    },
  },

  // ==================== 模块4: 其他工具 ====================

  'tools-info': {
    title: '查看媒体信息',
    description: '使用 ffprobe 查看媒体文件的格式、流和帧信息。',
    binary: 'ffprobe',
    params: [
      { id: 'inputFile',  label: '媒体文件', type: 'file', required: true },
      { id: 'infoMode',   label: '信息类型', type: 'select', required: true, options: [
        { value: 'format',  label: '简要信息 — 显示基础格式信息 (-show_format)' },
        { value: 'streams', label: '详细信息 — 显示所有流信息 (-show_streams)' },
        { value: 'frames',  label: '帧信息 — 显示每帧详细信息 (-show_frames)' },
        { value: 'json',    label: 'JSON 格式 — 输出结构化数据' },
      ]},
    ],
    buildCommand(params) {
      const mode = params.infoMode || 'format';
      const args = [];
      if (mode === 'format')  args.push('-show_format');
      if (mode === 'streams') args.push('-show_streams');
      if (mode === 'frames')  args.push('-show_frames');
      args.push('-print_format', 'json');
      if (mode === 'json')    args.push('-show_format', '-show_streams');
      return args;
    },
    // ffprobe 不需要输出文件
    noOutputFile: true,
  },

  'tools-gif': {
    title: '生成 GIF',
    description: '从视频片段生成 GIF 动图，支持标准和高质量调色板模式。',
    params: [
      { id: 'inputFile',  label: '输入文件', type: 'file', required: true },
      { id: 'gifQuality', label: 'GIF 质量', type: 'select', required: true, options: [
        { value: 'standard', label: '标准 GIF — 10fps, 480宽度' },
        { value: 'hd',       label: '高清 GIF — 15fps, 720宽度' },
        { value: 'low',      label: '低质量 GIF — 8fps, 320宽度' },
        { value: 'palette',  label: '高质量调色板 GIF — 画质更好' },
      ]},
      { id: 'startTime',  label: '起始时间 (可选)', type: 'text', placeholder: '00:00:00' },
      { id: 'duration',   label: '持续时间 (可选)', type: 'text', placeholder: '00:00:05' },
      { id: 'outputFile', label: '输出文件', type: 'fileOut', required: true },
    ],
    buildCommand(params) {
      const quality = params.gifQuality || 'standard';
      const map = {
        standard: ['-vf', 'fps=10,scale=480:-1'],
        hd:       ['-vf', 'fps=15,scale=720:-1'],
        low:      ['-vf', 'fps=8,scale=320:-1'],
        palette:  ['-filter_complex', '[0:v]fps=10,scale=480:-1,split[a][b];[a]palettegen[p];[b][p]paletteuse'],
      };
      return map[quality] || map.standard;
    },
  },
};

// ================================================================
//  全局状态
// ================================================================

let activeToolId = null;
let isRunning = false;
let cancelStderr = null;
let theme = 'dark';

// 页面缓存：切换工具时保留表单状态
const pageCache = new Map();    // toolId -> { formValues }
let currentPageEl = null;       // 当前显示的 .tool-page 元素

// 任务注册表
const taskRegistry = [];
let taskIdCounter = 0;

// ================================================================
//  初始化
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  loadTheme();
  showWelcome();
  loadVersion();
});

// ================================================================
//  侧边栏构建
// ================================================================

function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';

  NAV_TREE.forEach((category) => {
    const catDiv = document.createElement('div');
    catDiv.className = 'nav-category';
    catDiv.dataset.catId = category.id;

    const header = document.createElement('button');
    header.className = 'nav-category-header';
    header.innerHTML = `
      ${category.icon}
      <span>${category.label}</span>
      <svg class="icon-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    `;
    header.addEventListener('click', () => toggleCategory(catDiv));

    const submenu = document.createElement('div');
    submenu.className = 'nav-submenu';

    category.items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.toolId = item.id;
      btn.innerHTML = `<span class="nav-dot"></span>${item.label}`;
      btn.addEventListener('click', () => selectTool(item.id, btn));
      submenu.appendChild(btn);
    });

    catDiv.appendChild(header);
    catDiv.appendChild(submenu);
    nav.appendChild(catDiv);

    // 默认展开全部
    updateSubmenuHeight(submenu);
  });

  // 主题切换
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function toggleCategory(catDiv) {
  catDiv.classList.toggle('collapsed');
  const submenu = catDiv.querySelector('.nav-submenu');
  updateSubmenuHeight(submenu);
}

function updateSubmenuHeight(submenu) {
  if (!submenu.parentElement.classList.contains('collapsed')) {
    submenu.style.maxHeight = submenu.scrollHeight + 'px';
  } else {
    submenu.style.maxHeight = '0px';
  }
}

// ================================================================
//  工具选择 & 表单渲染
// ================================================================

function selectTool(toolId, btnEl) {
  // 高亮导航
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
    // 确保所属分类展开
    const catDiv = btnEl.closest('.nav-category');
    if (catDiv && catDiv.classList.contains('collapsed')) toggleCategory(catDiv);
  }

  // 任务列表是特殊页面
  if (toolId === 'task-list') {
    activeToolId = toolId;
    showTaskListPage();
    return;
  }

  // 离开当前工具前，保存表单值
  if (activeToolId && activeToolId !== toolId && TOOLS[activeToolId]) {
    const vals = collectFormValues(TOOLS[activeToolId]);
    pageCache.set(activeToolId, { formValues: vals });
  }

  activeToolId = toolId;
  const tool = { ...TOOLS[toolId], id: toolId };
  if (!TOOLS[toolId]) return;

  // 隐藏欢迎页
  document.getElementById('welcomePage').style.display = 'none';

  // 隐藏当前页
  if (currentPageEl) currentPageEl.style.display = 'none';

  // 检查是否有缓存页
  let pageEl = document.querySelector(`.tool-page[data-tool="${toolId}"]`);
  if (!pageEl) {
    pageEl = buildToolPageDOM(tool);
    document.getElementById('mainContent').appendChild(pageEl);
  } else {
    // 恢复缓存表单值
    const cached = pageCache.get(toolId);
    if (cached && cached.formValues) {
      restoreFormValues(pageEl, tool, cached.formValues);
    }
  }

  pageEl.style.display = '';
  currentPageEl = pageEl;

  // 刷新运行按钮
  updateRunButton(tool);
}

// 构建工具页 DOM（只执行一次，之后缓存复用）
function buildToolPageDOM(tool) {
  const page = document.createElement('div');
  page.className = 'tool-page';
  page.dataset.tool = tool.id;

  const binaryName = tool.binary || 'ffmpeg';
  let paramsHtml = '';
  tool.params.forEach((p) => { paramsHtml += renderParam(p); });

  page.innerHTML = `
    <div class="tool-header">
      <h2>${tool.title}</h2>
      <p>${tool.description}</p>
    </div>
    <div class="form-card">
      <div class="form-card-title">参数设置</div>
      <form class="tool-form" autocomplete="off">${paramsHtml}</form>
    </div>
    <div class="action-bar">
      <button class="btn btn-primary btn-lg btn-run" data-action="run" disabled>▶ 运行 ${binaryName}</button>
      <button class="btn btn-secondary btn-cancel" data-action="cancel" style="display:none">■ 取消</button>
      <button class="btn btn-secondary btn-preview" data-action="preview">预览命令</button>
    </div>
    <div class="cmd-preview hidden" data-section="cmd">
      <div class="cmd-label">生成的命令</div>
      <code class="cmd-text"></code>
    </div>
    <div class="progress-wrap hidden" data-section="progress">
      <div class="progress-fill" style="width:0%"></div>
    </div>
    <div class="log-panel hidden" data-section="log">
      <div class="log-panel-header">
        <span>输出日志</span>
        <button class="btn btn-sm btn-secondary btn-clear-log">清空</button>
      </div>
      <div class="log-panel-body"></div>
    </div>
  `;

  bindFormEvents(tool, page);
  return page;
}

// 恢复表单值
function restoreFormValues(page, tool, cached) {
  if (!cached || !cached.formValues) return;
  const { values, raw } = cached.formValues;
  tool.params.forEach((p) => {
    if (p.type === 'combo') {
      const sel = page.querySelector(`[name="param-${p.id}-select"]`);
      const inp = page.querySelector(`[name="param-${p.id}-input"]`);
      if (sel && values?.[p.id] !== undefined) sel.value = values[p.id];
      if (inp && raw?.[p.id] !== undefined) inp.value = raw[p.id];
    } else {
      const el = page.querySelector(`[name="param-${p.id}"]`);
      if (el && values?.[p.id] !== undefined) el.value = values[p.id];
    }
  });
}

function renderParam(p) {
  const required = p.required ? ' <span style="color:var(--danger)">*</span>' : '';

  switch (p.type) {
    case 'file':
      return `
        <div class="form-row">
          <div class="form-group full-width">
            <label>${p.label}${required}</label>
            <div class="file-picker">
              <input type="text" class="form-input" name="param-${p.id}" placeholder="${p.placeholder || '点击浏览选择文件...'}" readonly>
              <button type="button" class="btn btn-secondary btn-sm" data-file-picker="${p.id}">浏览</button>
            </div>
          </div>
        </div>`;

    case 'fileOut':
      return `
        <div class="form-row">
          <div class="form-group full-width">
            <label>${p.label}${required}</label>
            <div class="file-picker">
              <input type="text" class="form-input" name="param-${p.id}" placeholder="${p.placeholder || '点击浏览选择保存位置...'}" readonly>
              <button type="button" class="btn btn-secondary btn-sm" data-file-out="${p.id}">浏览</button>
            </div>
          </div>
        </div>`;

    case 'select':
      return `
        <div class="form-row">
          <div class="form-group">
            <label>${p.label}${required}</label>
            <select class="form-select" name="param-${p.id}">
              ${(p.options || []).map((o) => `<option value="${o.value}" ${o.value === p.defaultValue ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
          </div>
        </div>`;

    case 'combo':
      return `
        <div class="form-row">
          <div class="form-group">
            <label>${p.label}${required}</label>
            <div class="input-combo">
              <select class="form-select" name="param-${p.id}-select">
                ${(p.options || []).map((o) => `<option value="${o.value}" ${o.value === p.defaultValue ? 'selected' : ''}>${o.label}</option>`).join('')}
              </select>
              <input type="text" class="form-input" name="param-${p.id}-input" placeholder="${p.placeholder || '自定义值'}">
            </div>
          </div>
        </div>`;

    case 'text':
      return `
        <div class="form-row">
          <div class="form-group">
            <label>${p.label}${required}</label>
            <input type="text" class="form-input" name="param-${p.id}" placeholder="${p.placeholder || ''}" value="${p.defaultValue || ''}">
          </div>
        </div>`;

    case 'number':
      return `
        <div class="form-row">
          <div class="form-group">
            <label>${p.label}${required}</label>
            <input type="number" class="form-input" name="param-${p.id}" placeholder="${p.placeholder || ''}" value="${p.defaultValue || ''}">
          </div>
        </div>`;

    default:
      return '';
  }
}

// ================================================================
//  表单事件绑定
// ================================================================

function bindFormEvents(tool, page) {
  // 文件选择器按钮
  page.querySelectorAll('[data-file-picker]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const paramId = btn.dataset.filePicker;
      const path = await window.electronAPI.selectInputFile();
      if (path) {
        const input = page.querySelector(`[name="param-${paramId}"]`);
        if (input) input.value = path;
        updateRunButton(tool);
      }
    });
  });

  // 输出文件选择器按钮
  page.querySelectorAll('[data-file-out]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const paramId = btn.dataset.fileOut;
      const path = await window.electronAPI.selectOutputFile();
      if (path) {
        const input = page.querySelector(`[name="param-${paramId}"]`);
        if (input) input.value = path;
        updateRunButton(tool);
      }
    });
  });

  // 所有表单控件 change 时检查是否可以运行
  const form = page.querySelector('.tool-form');
  form.addEventListener('input', () => updateRunButton(tool));
  form.addEventListener('change', () => updateRunButton(tool));

  // 运行按钮
  page.querySelector('.btn-run').addEventListener('click', () => runFFmpeg(tool, page));

  // 取消按钮
  page.querySelector('.btn-cancel').addEventListener('click', async () => {
    await window.electronAPI.cancelFFmpeg();
    if (cancelStderr) { cancelStderr(); cancelStderr = null; }
    setRunning(false, page);
    appendLog(page, '⏹ 已取消', 'warn');
    setStatus('已取消');
  });

  // 预览命令按钮
  page.querySelector('.btn-preview').addEventListener('click', () => previewCommand(tool, page));

  // 清空日志按钮
  page.querySelector('.btn-clear-log').addEventListener('click', () => {
    const logBody = page.querySelector('.log-panel-body');
    if (logBody) logBody.innerHTML = '';
    page.querySelector('[data-section="log"]').classList.add('hidden');
  });

  // 初始检查
  updateRunButton(tool);
}

// ================================================================
//  表单值收集
// ================================================================

function collectFormValues(tool) {
  const page = currentPageEl;
  if (!page) return { values: {}, inputFiles: {} };

  const values = {};
  const raw = {};
  const inputFiles = {};

  tool.params.forEach((p) => {
    if (p.type === 'combo') {
      const select = page.querySelector(`[name="param-${p.id}-select"]`);
      const input = page.querySelector(`[name="param-${p.id}-input"]`);
      const selVal = select ? select.value : '';
      values[p.id] = selVal;
      if (input && input.value) {
        values[p.id] = input.value;
        raw[p.id] = input.value;
      }
    } else {
      const el = page.querySelector(`[name="param-${p.id}"]`);
      if (el) {
        values[p.id] = el.value;
        if (p.type === 'file' && el.value) {
          inputFiles[p.id] = el.value;
        }
      }
    }
  });

  return { values, raw, inputFiles };
}

function updateRunButton(tool) {
  const page = currentPageEl;
  if (!page) return;
  const btn = page.querySelector('.btn-run');
  if (!btn || isRunning) return;

  const { values } = collectFormValues(tool);
  const hasInput = tool.params.some((p) => p.type === 'file' && values[p.id]);
  const noOutputNeeded = tool.noOutputFile;
  const hasOutput = noOutputNeeded || tool.params.some((p) => p.type === 'fileOut' && values[p.id]);

  btn.disabled = !(hasInput && (hasOutput || noOutputNeeded));
}

// ================================================================
//  命令构建 & 预览
// ================================================================

function buildCommand(tool, values, inputFiles) {
  const binary = tool.binary || 'ffmpeg';
  const rawArgs = tool.buildCommand(values);
  const result = Array.isArray(rawArgs) ? rawArgs : (rawArgs?.args || rawArgs || []);

  let extraInputs = [];
  let mainArgs = [];

  if (Array.isArray(result)) {
    mainArgs = result;
  } else if (result && typeof result === 'object') {
    extraInputs = result.extraInputs || [];
    mainArgs = result.args || [];
  }

  // 构建完整参数列表
  const allArgs = [];

  // 输入文件
  if (tool.id.startsWith('audioproc-merge')) {
    // 合并音频：两个输入
    const a = values.inputFileA || inputFiles?.inputFileA;
    const b = values.inputFileB || inputFiles?.inputFileB;
    if (a) { allArgs.push('-i', a); }
    if (b) { allArgs.push('-i', b); }
  } else if (tool.id === 'audio-replace') {
    const video = values.inputVideo || inputFiles?.inputVideo;
    const audio = values.inputAudio || inputFiles?.inputAudio;
    if (video) { allArgs.push('-i', video); }
    // 额外的音频输入和延迟参数
    if (extraInputs.length > 0) {
      allArgs.push(...extraInputs);
    } else if (audio) {
      allArgs.push('-i', audio);
    }
  } else {
    // 常规单个输入
    const inputFile = Object.values(inputFiles || {})[0] || values.inputFile || values.inputFileA;
    if (inputFile) {
      allArgs.push('-i', inputFile);
    }
    // 额外的输入
    if (extraInputs.length > 0) {
      allArgs.push(...extraInputs);
    }
  }

  // 主参数（ffmpeg 安全标志：不等待 stdin，覆盖不询问）
  if (binary === 'ffmpeg') {
    allArgs.push('-nostdin', '-y');
  }
  allArgs.push(...mainArgs);

  // 输出文件（ffprobe 不需要）
  if (!tool.noOutputFile) {
    const outputFile = values.outputFile || 'output.mp4';
    allArgs.push(outputFile);
  }

  return { binary, args: allArgs };
}

function previewCommand(tool, page) {
  const { values, inputFiles } = collectFormValues(tool);
  const cmd = buildCommand(tool, values, inputFiles);

  const preview = page.querySelector('[data-section="cmd"]');
  const cmdText = page.querySelector('.cmd-text');
  preview.classList.remove('hidden');
  cmdText.textContent = `${cmd.binary} ${cmd.args.join(' ')}`;
}

// ================================================================
//  任务管理
// ================================================================

function findToolCategoryAndLabel(toolId) {
  for (const cat of NAV_TREE) {
    for (const item of cat.items) {
      if (item.id === toolId) return { category: cat.label, label: item.label };
    }
  }
  return { category: '', label: toolId };
}

function createTask(toolId, command, outputFile) {
  const { category, label } = findToolCategoryAndLabel(toolId);
  const task = {
    id: ++taskIdCounter,
    toolId,
    toolLabel: label,
    toolCategory: category,
    command,
    status: 'running',
    progress: 0,
    startTime: Date.now(),
    endTime: null,
    outputFile,
    exitCode: null,
  };
  taskRegistry.unshift(task);
  updateNavProgressIndicators();
  return task;
}

function completeTask(taskId, success, exitCode) {
  const task = taskRegistry.find(t => t.id === taskId);
  if (!task) return;
  task.status = success ? 'completed' : 'failed';
  task.endTime = Date.now();
  task.exitCode = exitCode;
  task.progress = success ? 100 : 0;
  updateNavProgressIndicators();
  updateTaskListIfVisible();
}

function cancelTask(taskId) {
  const task = taskRegistry.find(t => t.id === taskId);
  if (!task) return;
  task.status = 'cancelled';
  task.endTime = Date.now();
  updateNavProgressIndicators();
  updateTaskListIfVisible();
}

function updateNavProgressIndicators() {
  const runningTools = new Set(
    taskRegistry.filter(t => t.status === 'running').map(t => t.toolId)
  );
  document.querySelectorAll('.nav-item').forEach(item => {
    const toolId = item.dataset.toolId;
    const existing = item.querySelector('.nav-progress');
    if (runningTools.has(toolId)) {
      if (!existing) {
        const dot = document.createElement('span');
        dot.className = 'nav-progress';
        item.appendChild(dot);
      }
    } else {
      if (existing) existing.remove();
    }
  });
}

// ================================================================
//  运行 FFmpeg
// ================================================================

async function runFFmpeg(tool, page) {
  if (isRunning) return;

  const { values, inputFiles } = collectFormValues(tool);
  const cmd = buildCommand(tool, values, inputFiles);

  // 显示命令 & 日志，重置进度
  page.querySelector('[data-section="cmd"]').classList.remove('hidden');
  page.querySelector('.cmd-text').textContent = `${cmd.binary} ${cmd.args.join(' ')}`;
  page.querySelector('[data-section="progress"]').classList.remove('hidden');
  page.querySelector('.progress-fill').style.width = '0%';
  delete page.dataset.durationSec;
  page.querySelector('[data-section="log"]').classList.remove('hidden');
  page.querySelector('.log-panel-body').innerHTML = '';

  appendLog(page, `▶ ${cmd.binary} ${cmd.args.join(' ')}`, '');
  setStatus('运行中...');
  setRunning(true, page);

  // 创建任务记录
  const task = createTask(tool.id, `${cmd.binary} ${cmd.args.join(' ')}`, values.outputFile || null);

  // 注册 stderr 实时监听
  if (cancelStderr) cancelStderr();
  cancelStderr = window.electronAPI.onStderr((data) => {
    appendLog(page, data, '');
    updateProgressFromStderr(data, page);
  });

  try {
    const isProbe = cmd.binary === 'ffprobe';
    const sendArgs = isProbe ? ['ffprobe', ...cmd.args] : cmd.args;
    const result = await window.electronAPI.runFFmpeg(sendArgs);

    if (cancelStderr) { cancelStderr(); cancelStderr = null; }

    setRunning(false, page);

    if (result.success) {
      // 进度条 100%
      const fill = page.querySelector('.progress-fill');
      if (fill) fill.style.width = '100%';
      appendLog(page, '\n✅ 任务完成', 'success');
      setStatus('完成');
      completeTask(task.id, true, result.exitCode);
      if (!tool.noOutputFile && values.outputFile) {
        appendLog(page, `📁 ${values.outputFile}`, 'success');
      }
    } else {
      appendLog(page, `\n❌ 退出码 ${result.exitCode}`, 'error');
      setStatus(`失败 (退出码: ${result.exitCode})`);
      completeTask(task.id, false, result.exitCode);
    }
  } catch (err) {
    if (cancelStderr) { cancelStderr(); cancelStderr = null; }
    setRunning(false, page);
    appendLog(page, `\n❌ ${err.message}`, 'error');
    setStatus('错误');
    completeTask(task.id, false, -1);
  }
}

function setRunning(running, page) {
  isRunning = running;
  const btnRun = page?.querySelector('.btn-run');
  const btnCancel = page?.querySelector('.btn-cancel');

  if (btnRun) {
    btnRun.disabled = running;
    btnRun.style.display = running ? 'none' : '';
  }
  if (btnCancel) {
    btnCancel.style.display = running ? '' : 'none';
  }
}

// ================================================================
//  进度解析 & 日志
// ================================================================

// 辅助：解析 HH:MM:SS.ms → 总秒数
function parseTimeToSec(timeStr) {
  const m = timeStr.match(/(\d+):(\d{2}):(\d{2})\.(\d+)/);
  if (!m) return null;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 100;
}

function updateProgressFromStderr(data, page) {
  if (!page) return;

  // 1) 尝试从输出中提取总时长（只在编码开始时出现一次）
  const durMatch = data.match(/Duration:\s*(\d+:\d{2}:\d{2}\.\d+)/);
  if (durMatch && !page.dataset.durationSec) {
    const durSec = parseTimeToSec(durMatch[1]);
    if (durSec && durSec > 0) {
      page.dataset.durationSec = durSec;
    }
  }

  // 2) 提取当前处理到的时间点
  const timeMatch = data.match(/time=(\d+:\d{2}:\d{2}\.\d+)/);
  if (timeMatch) {
    const currentSec = parseTimeToSec(timeMatch[1]);
    if (currentSec === null) return;

    const fill = page.querySelector('.progress-fill');
    if (!fill) return;

    const totalDur = parseFloat(page.dataset.durationSec) || 0;

    if (totalDur > 0) {
      // 有总时长 → 精确百分比
      const pct = Math.min(99, Math.round((currentSec / totalDur) * 100));
      fill.style.width = pct + '%';
    } else {
      // 没有总时长（如 ffprobe 或流式输入）→ 用当前秒数做脉冲动画
      const bounce = 20 + ((currentSec % 10) / 10) * 40;
      fill.style.width = Math.min(90, bounce) + '%';
    }
  }
}

function appendLog(page, text, cls) {
  const body = page?.querySelector('.log-panel-body');
  if (!body) return;
  const span = document.createElement('span');
  span.className = cls ? `log-${cls}` : '';
  span.textContent = text;
  body.appendChild(span);
  body.appendChild(document.createTextNode('\n'));
  body.scrollTop = body.scrollHeight;
}

function setStatus(text) {
  document.getElementById('statusText').textContent = text;
}

// ================================================================
//  任务列表页
// ================================================================

function showTaskListPage() {
  document.getElementById('welcomePage').style.display = 'none';
  if (currentPageEl) currentPageEl.style.display = 'none';
  currentPageEl = null;

  let listEl = document.getElementById('taskListPage');
  if (!listEl) {
    listEl = document.createElement('div');
    listEl.id = 'taskListPage';
    listEl.className = 'tool-page';
    document.getElementById('mainContent').appendChild(listEl);
  }
  listEl.style.display = '';
  currentPageEl = listEl;
  renderTaskList(listEl);
}

function updateTaskListIfVisible() {
  const listEl = document.getElementById('taskListPage');
  if (listEl && listEl.style.display !== 'none') {
    renderTaskList(listEl);
  }
}

function renderTaskList(listEl) {
  if (taskRegistry.length === 0) {
    listEl.innerHTML = `
      <div class="tool-header"><h2>任务列表</h2><p>追踪所有正在执行和已完成的任务</p></div>
      <div class="form-card"><div class="task-empty">暂无任务记录</div></div>`;
    return;
  }

  const rows = taskRegistry.map(t => {
    const statusLabel = { running: '进行中', completed: '已完成', failed: '失败', cancelled: '已取消' }[t.status] || t.status;
    const elapsed = t.endTime ? formatDuration(t.endTime - t.startTime) : formatDuration(Date.now() - t.startTime);
    return `
      <tr>
        <td>#${t.id}</td>
        <td>${t.toolCategory} › ${t.toolLabel}</td>
        <td><span class="task-status"><span class="task-dot ${t.status}"></span>${statusLabel}</span></td>
        <td style="font-family:var(--font-mono);font-size:11px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(t.command)}">${escHtml(t.command)}</td>
        <td>${elapsed}</td>
        <td>${t.outputFile ? escHtml(t.outputFile.split(/[/\\\\]/).pop()) : '-'}</td>
      </tr>`;
  }).join('');

  listEl.innerHTML = `
    <div class="tool-header">
      <h2>任务列表</h2>
      <p>追踪所有正在执行和已完成的任务 · ${taskRegistry.length} 条记录</p>
    </div>
    <div class="form-card" style="overflow-x:auto;">
      <table class="task-table">
        <thead><tr><th>ID</th><th>工具</th><th>状态</th><th>命令</th><th>耗时</th><th>输出</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

// ================================================================
//  欢迎页
// ================================================================

function showWelcome() {
  // 隐藏所有工具页和任务列表
  document.querySelectorAll('.tool-page').forEach(p => p.style.display = 'none');
  const taskPage = document.getElementById('taskListPage');
  if (taskPage) taskPage.style.display = 'none';
  currentPageEl = null;
  activeToolId = null;
  // 清除导航高亮
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // 显示欢迎页
  document.getElementById('welcomePage').style.display = '';
}

// ================================================================
//  主题管理
// ================================================================

function loadTheme() {
  const stored = localStorage.getItem('ffmpeg-gui-theme');
  if (stored === 'light' || stored === 'dark') {
    theme = stored;
  } else {
    // 跟随系统
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme();
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  localStorage.setItem('ffmpeg-gui-theme', theme);
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
}

// ================================================================
//  版本信息
// ================================================================

async function loadVersion() {
  try {
    const ver = await window.electronAPI.getVersion();
    document.getElementById('statusVersion').textContent = ver;
  } catch {
    document.getElementById('statusVersion').textContent = 'FFmpeg (未检测到)';
  }
}

// ================================================================
//  窗口控制按钮
// ================================================================

function bindWindowControls() {
  document.getElementById('btnMinimize')?.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  document.getElementById('btnMaximize')?.addEventListener('click', () => {
    window.electronAPI.maximizeWindow();
  });
  document.getElementById('btnClose')?.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });

  // 双击标题栏最大化/还原（避开控制按钮区域）
  document.getElementById('titleBar')?.addEventListener('dblclick', (e) => {
    if (e.target.closest('.titlebar-captions')) return;
    window.electronAPI.maximizeWindow();
  });
}

// ================================================================
//  首次启动检测弹窗
// ================================================================

async function showSetupModal() {
  // 防止重复弹窗
  if (document.getElementById('setupOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'setupOverlay';
  overlay.className = 'setup-overlay';
  overlay.innerHTML = `
    <div class="setup-dialog">
      <h2>🔧 环境检测</h2>
      <p class="setup-subtitle">正在检查 FFmpeg / FFprobe 是否可用…</p>
      <div id="setupChecks">
        <div class="setup-check-row">
          <span class="setup-check-icon">⏳</span>
          <div class="setup-check-info">
            <div class="setup-check-name">FFmpeg</div>
            <div class="setup-check-ver">检测中…</div>
          </div>
        </div>
        <div class="setup-check-row">
          <span class="setup-check-icon">⏳</span>
          <div class="setup-check-info">
            <div class="setup-check-name">FFprobe</div>
            <div class="setup-check-ver">检测中…</div>
          </div>
        </div>
      </div>
      <div class="setup-actions" id="setupActions" style="display:none;">
        <button class="btn btn-primary" id="setupBtnContinue">开始使用</button>
      </div>
      <div id="setupDownloadHint" style="display:none;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // 执行检测
  let result;
  try {
    result = await window.electronAPI.checkSetup();
  } catch {
    result = { ffmpeg: { found: false }, ffprobe: { found: false }, allReady: false };
  }

  // 更新 FFmpeg 行
  updateSetupRow(0, result.ffmpeg);
  updateSetupRow(1, result.ffprobe);

  // 显示操作按钮
  const actions = document.getElementById('setupActions');
  actions.style.display = 'flex';

  if (result.allReady) {
    const btn = document.getElementById('setupBtnContinue');
    btn.textContent = '开始使用';
    btn.addEventListener('click', () => {
      overlay.remove();
      localStorage.setItem('ffmpeg-gui-setup-done', '1');
    });
  } else {
    const btn = document.getElementById('setupBtnContinue');
    btn.textContent = '重新检测';
    btn.addEventListener('click', async () => {
      // 重新检测
      overlay.querySelectorAll('.setup-check-icon').forEach(el => { el.textContent = '⏳'; el.className = 'setup-check-icon'; });
      overlay.querySelectorAll('.setup-check-ver').forEach(el => { el.textContent = '检测中…'; });
      document.getElementById('setupDownloadHint').style.display = 'none';
      try {
        result = await window.electronAPI.checkSetup();
      } catch {
        result = { ffmpeg: { found: false }, ffprobe: { found: false }, allReady: false };
      }
      updateSetupRow(0, result.ffmpeg);
      updateSetupRow(1, result.ffprobe);
      if (result.allReady) {
        btn.textContent = '开始使用';
        btn.onclick = () => {
          overlay.remove();
          localStorage.setItem('ffmpeg-gui-setup-done', '1');
        };
        document.getElementById('setupDownloadHint').style.display = 'none';
      } else {
        showDownloadHint(result);
      }
    });

    showDownloadHint(result);
  }

  // 点击遮罩不关闭（强制处理）
}

function updateSetupRow(index, info) {
  const rows = document.querySelectorAll('#setupChecks .setup-check-row');
  if (!rows[index]) return;
  const icon = rows[index].querySelector('.setup-check-icon');
  const ver  = rows[index].querySelector('.setup-check-ver');
  if (info.found) {
    icon.textContent = '✅';
    icon.className = 'setup-check-icon ok';
    ver.textContent = info.version || '已安装';
  } else {
    icon.textContent = '❌';
    icon.className = 'setup-check-icon fail';
    ver.textContent = '未找到';
  }
}

function showDownloadHint(result) {
  const hint = document.getElementById('setupDownloadHint');
  hint.style.display = 'block';
  const missing = [];
  if (!result.ffmpeg.found) missing.push('FFmpeg');
  if (!result.ffprobe.found) missing.push('FFprobe');
  hint.innerHTML = `
    <strong>⚠ ${missing.join(' 和 ')} 未找到</strong><br>
    请从官方网站下载并安装：<br>
    <a href="#" id="setupLinkFfmpeg">ffmpeg.org/download.html</a>
    ${missing.includes('FFprobe') ? '（FFprobe 随 FFmpeg 一同安装）' : ''}
  `;
  document.getElementById('setupLinkFfmpeg')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.electronAPI.openExternal('https://ffmpeg.org/download.html');
  });
}

// ================================================================
//  启动
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  buildSidebar();
  bindWindowControls();
  showWelcome();
  loadVersion();

  // 首次启动弹窗
  if (!localStorage.getItem('ffmpeg-gui-setup-done')) {
    showSetupModal();
  }
});
