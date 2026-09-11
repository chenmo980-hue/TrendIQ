# TrendIQ Downloader

WPF 桌面视频下载器，基于官方 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 引擎封装，支持 YouTube、B站、抖音等数千个站点。

## 功能

- 链接解析：标题 / UP主 / 时长 / 封面 / 全部可用格式
- 格式选择：分辨率、编码、码率、体积一目了然；DASH 自动音视频合并
- 仅音频：一键提取 MP3 / M4A / OPUS / FLAC / WAV
- 字幕下载（含自动字幕，转 srt）、封面图下载
- 任务列表：进度条、速度、取消、完成后打开文件
- 代理、Cookies 文件（会员视频 / 需登录站点）
- 工具自举：首次启动自动下载 yt-dlp.exe + ffmpeg；一键更新 yt-dlp

## 使用

1. 首次启动会自动下载 `yt-dlp.exe`（~17MB）和 `ffmpeg.exe`（~98MB）到程序旁的 `tools/`
2. 粘贴视频链接 → 回车或点「解析」
3. 选格式（或勾「仅音频」）→ 「开始下载」
4. YouTube 如提示 `Sign in to confirm you're not a bot`，在「设置」里填 Cookie 文件（浏览器导出）与代理

## 开发

```powershell
cd VideoDownloader
dotnet build -c Release
dotnet run
```

- .NET 8 WPF，零第三方 NuGet 依赖
- `Services/YtDlpService.cs` — 进程封装：`-J` 元数据解析、`--newline` + `--progress-template` 进度解析、取消、更新、工具下载
- `MainViewModel.cs` — MVVM（手写 INotifyPropertyChanged）
- `--smoke-test [url] [proxy]` 命令行模式用于自动化端到端验证（无窗口），结果写 `smoke-result.txt`

## 已验证

- bilibili 公开视频：解析 15 格式 → 1080P DASH 下载 → ffmpeg 合并 MP4 ✓
- 工具链自举：GitHub Release 下载 yt-dlp + gyan.dev ffmpeg 解压 ✓
- YouTube 无 Cookie 时会被风控拦截，属预期行为，UI 已提供 Cookie/代理入口

## 许可

- 本项目代码：MIT
- 分发时请注意 yt-dlp（Unlicense）与 ffmpeg（GPL/LGPL，gyan.dev 构建）各自的许可协议
