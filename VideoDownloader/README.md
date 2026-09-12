# TrendIQ Downloader

WPF 桌面视频下载器，基于官方 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 引擎封装，支持 YouTube、B站、抖音等数千个站点。

## 功能

- 链接解析：标题 / UP主 / 时长 / 封面 / 全部可用格式
- 格式选择：分辨率、编码、码率、体积一目了然；DASH 自动音视频合并
- 仅音频：一键提取 MP3 / M4A / OPUS / FLAC / WAV
- 字幕下载（含自动字幕，转 srt）、封面图下载
- **视频内容转中文文本**：自动获取中文字幕（无真中文时用 YouTube 机翻 zh-Hans），生成同名 `.zh.txt` 纯文本
- 任务列表：进度条、速度、取消、完成后打开文件
- 代理、Cookies 文件（会员视频 / 需登录站点）
- 工具自举：首次启动自动下载 yt-dlp.exe + ffmpeg；一键更新 yt-dlp

## 视频转中文文本（方案 A）

下载时勾选「转中文文本」即可。原理：

1. 优先请求站点自带的中文字幕（zh-Hans / zh / zh-CN）
2. YouTube 无真中文时自动使用其机翻字幕（请求 `zh-Hans` 即返回机器翻译）
3. srt/vtt 去掉时间轴、去重、合并成可读的 `.zh.txt`（UTF-8 BOM，记事本/VSCode 直接打开）

局限：该方案依赖视频已有字幕。**无字幕视频需要音频转写（Whisper，方案 B），未内置**。

## 使用

1. 首次启动会自动下载 `yt-dlp.exe`（~17MB）和 `ffmpeg.exe`（~98MB）到程序旁的 `tools/`
2. 粘贴视频链接 → 回车或点「解析」
3. 选格式（或勾「仅音频」）→ 「开始下载」
4. YouTube 如提示 `Sign in to confirm you're not a bot`，在「设置」里填 Cookie 文件（浏览器导出）与代理；本仓库附带 `youtube-cookies.txt` 可直接选用（设置 → Cookie 文件）

## 开发

```powershell
cd VideoDownloader
dotnet build -c Release
dotnet run
```

- .NET 8 WPF，零第三方 NuGet 依赖
- `Services/YtDlpService.cs` — 进程封装：`-J` 元数据解析、`--newline` + `--progress-template` 进度解析、取消、更新、工具下载、字幕两阶段下载（带 429 限流重试）
- `Services/SrtToTextService.cs` — srt/vtt → 纯文本转换（去索引行/时间轴/重复行）
- `MainViewModel.cs` — MVVM（手写 INotifyPropertyChanged）
- `--smoke-test [url] [proxy]` 命令行模式用于自动化端到端验证（无窗口），结果写 `smoke-result.txt`

## 已验证

- bilibili 公开视频：解析 15 格式 → 1080P DASH 下载 → ffmpeg 合并 MP4 ✓
- YouTube（登录 Cookie）：解析 43 格式 → 4K 下载合并 ✓；`zh-Hans` 机翻字幕 → 中文 srt → `.zh.txt` ✓
- 工具链自举：GitHub Release 下载 yt-dlp + gyan.dev ffmpeg 解压 ✓
- YouTube 无 Cookie 会被风控拦截（需 Cookie + 代理）；字幕接口高频请求会 429 限流（已内置重试）

## 已知问题

- Chrome/Edge 127+ 的 app-bound 加密导致 `--cookies-from-browser` 无法解密本机浏览器 Cookie；本机 CentBrowser 的 Cookie 因 DPAPI 用户级密钥跨机不可解。**推荐用 CDP 导出 cookies.txt**（浏览器开 `--remote-debugging-port=9333` 后从 DevTools 协议拉 `Network.getCookies`）
- yt-dlp.exe（PyInstaller 打包）偶发 `Failed to load Python DLL` 启动失败，重试即可；清理 `%TEMP%\_MEI*` 可减少复发

## 许可

- 本项目代码：MIT
- 分发时请注意 yt-dlp（Unlicense）与 ffmpeg（GPL/LGPL，gyan.dev 构建）各自的许可协议
