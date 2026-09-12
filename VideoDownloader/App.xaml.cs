using System.IO;
using System.Text;
using System.Windows;
using TrendIQDownloader.Services;

namespace TrendIQDownloader;

public partial class App : System.Windows.Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        if (e.Args.Length > 0 && e.Args[0] == "--smoke-test")
        {
            _ = RunSmokeAsync(e.Args);
            return;
        }
        base.OnStartup(e);
        var win = new MainWindow();
        win.Show();
    }

    private static async Task RunSmokeAsync(string[] args)
    {
        var sb = new StringBuilder();
        var url = args.Length > 1 ? args[1] : "https://www.youtube.com/watch?v=BaW_jenozKc";
        var settings = new Services.SettingsService().Load();
        var proxy = args.Length > 2 ? args[2] : settings.Proxy;
        sb.AppendLine($"url: {url}");
        sb.AppendLine($"proxy: {proxy ?? "(none)"}");
        sb.AppendLine($"settingsCookie: {(string.IsNullOrEmpty(settings.CookieFile) ? "(none)" : settings.CookieFile)}");
        var resultPath = Path.Combine(AppContext.BaseDirectory, "smoke-result.txt");
        try
        {
            var svc = new YtDlpService();
            sb.AppendLine($"toolsDir: {svc.ToolsDir}");
            await svc.EnsureToolsAsync(false, proxy, new Progress<string>(s => sb.AppendLine("tool: " + s)), new Progress<Models.ToolsProgress>(p => sb.AppendLine($"dl {p.Name}: {p.Current / 1048576}MB/{p.Total / 1048576}MB")), CancellationToken.None);
            var cookieFile = Path.Combine(AppContext.BaseDirectory, "youtube-cookies.txt");
            var useCookies = File.Exists(cookieFile) && url.Contains("youtube.com", StringComparison.OrdinalIgnoreCase);            var ck = useCookies ? cookieFile : null;
            var info = await svc.FetchInfoAsync(url, proxy, ck, new Progress<string>(s => sb.AppendLine("info-log: " + s)), CancellationToken.None);
            sb.AppendLine($"title: {info.Title}");
            sb.AppendLine($"uploader: {info.Uploader}");
            sb.AppendLine($"duration: {info.DurationText}");
            sb.AppendLine($"formats: {info.Formats.Count}");
            var outDir = Path.Combine(Path.GetTempPath(), "tq-smoke");
            Directory.CreateDirectory(outDir);
            await svc.DownloadAsync(new Models.DownloadRequest
            {
                Url = url,
                OutputDir = outDir,
                FormatArg = "bv*+ba/b",
                Proxy = proxy,
                CookieFile = ck,
                TranslateToChinese = true,
            }, new Progress<Models.DownloadProgress>(p => sb.AppendLine($"progress: {p.Stage} {p.Percent?.ToString("0.#") ?? "-"}% {p.Speed} ETA {p.Eta}")),
               new Progress<string>(s => sb.AppendLine("log: " + s)), CancellationToken.None);
            // 模拟 ViewModel：找最新视频文件并生成中文字幕文本
            var video = new DirectoryInfo(outDir).GetFiles()
                .Where(f => f.Extension is ".mp4" or ".mkv" or ".webm")
                .OrderByDescending(f => f.LastWriteTimeUtc)
                .FirstOrDefault();
            sb.AppendLine($"video: {video?.Name ?? "none"}");
            var srtFiles = new DirectoryInfo(outDir).GetFiles("*.srt");
            foreach (var s in srtFiles) sb.AppendLine("srt: " + s.Name);
            if (video != null)
            {
                var txt = SrtToTextService.GenerateTextForVideo(video.FullName);
                sb.AppendLine($"zhTxt: {(txt != null ? "YES -> " + Path.GetFileName(txt) : "NO")}");
                if (txt != null)
                {
                    var lines = await File.ReadAllLinesAsync(txt);
                    sb.AppendLine($"zhLines: {lines.Length}");
                    foreach (var l in lines.Take(6)) sb.AppendLine("zh: " + l);
                }
            }
            sb.AppendLine("SMOKE OK");
        }
        catch (Exception ex)
        {
            sb.AppendLine($"SMOKE FAIL: {ex.Message}");
        }
        finally
        {
            await File.WriteAllTextAsync(resultPath, sb.ToString());
            Current.Shutdown(0);
        }
    }
}
