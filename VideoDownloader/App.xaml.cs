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
        var proxy = args.Length > 2 ? args[2] : null;
        sb.AppendLine($"url: {url}");
        sb.AppendLine($"proxy: {proxy ?? "(none)"}");
        var resultPath = Path.Combine(AppContext.BaseDirectory, "smoke-result.txt");
        try
        {
            var svc = new YtDlpService();
            sb.AppendLine($"toolsDir: {svc.ToolsDir}");
            await svc.EnsureToolsAsync(false, proxy, new Progress<string>(s => sb.AppendLine("tool: " + s)), new Progress<Models.ToolsProgress>(p => sb.AppendLine($"dl {p.Name}: {p.Current / 1048576}MB/{p.Total / 1048576}MB")), CancellationToken.None);
            var info = await svc.FetchInfoAsync(url, proxy, null, new Progress<string>(s => sb.AppendLine("info-log: " + s)), CancellationToken.None);
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
            }, new Progress<Models.DownloadProgress>(p => sb.AppendLine($"progress: {p.Stage} {p.Percent?.ToString("0.#") ?? "-"}% {p.Speed} ETA {p.Eta}")),
               new Progress<string>(s => sb.AppendLine("log: " + s)), CancellationToken.None);
            var files = Directory.GetFiles(outDir);
            sb.AppendLine($"files: {files.Length}");
            foreach (var f in files) sb.AppendLine("file: " + f);
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
