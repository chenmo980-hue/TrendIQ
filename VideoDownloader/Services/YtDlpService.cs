using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using TrendIQDownloader.Models;

namespace TrendIQDownloader.Services;

public partial class YtDlpService
{
    private static readonly HttpClient Http = CreateClient();

    private static HttpClient CreateClient()
    {
        var handler = new HttpClientHandler { AllowAutoRedirect = true };
        return new HttpClient(handler) { Timeout = TimeSpan.FromMinutes(10) };
    }

    public string ToolsDir { get; }
    public string YtDlpPath => Path.Combine(ToolsDir, "yt-dlp.exe");
    public string FfmpegPath => Path.Combine(ToolsDir, "ffmpeg.exe");
    public string VersionFile => Path.Combine(ToolsDir, ".version.json");

    private Process? _infoProc;
    private Process? _dlProc;

    public YtDlpService()
    {
        ToolsDir = Path.Combine(AppContext.BaseDirectory, "tools");
        Directory.CreateDirectory(ToolsDir);
    }

    public bool ToolsExist() => File.Exists(YtDlpPath);

    public void CancelAll()
    {
        TryKill(_infoProc);
        TryKill(_dlProc);
    }

    private static void TryKill(Process? p)
    {
        if (p is { HasExited: false })
        {
            try { p.Kill(entireProcessTree: true); } catch { }
        }
    }

    private List<string> BaseArgs(string? proxy, string? cookieFile)
    {
        var args = new List<string> { "--no-warnings", "--ffmpeg-location", $"\"{ToolsDir}\"" };
        if (!string.IsNullOrWhiteSpace(proxy))
            args.AddRange(["--proxy", $"\"{proxy}\""]);
        if (!string.IsNullOrWhiteSpace(cookieFile) && File.Exists(cookieFile))
            args.AddRange(["--cookies", $"\"{cookieFile}\""]);
        return args;
    }

    private static readonly string[] FallbackClients = ["web_safari", "tv", "mweb"];

    public async Task<VideoInfo> FetchInfoAsync(string url, string? proxy, string? cookieFile,
        IProgress<string>? log, CancellationToken ct)
    {
        if (!ToolsExist()) throw new InvalidOperationException("yt-dlp.exe 未就绪，请先点击「工具/更新」下载。");
        Exception? lastEx = null;
        // 依次尝试：默认 → web_safari → tv → mweb（YouTube 动态风控，不同客户端被拦概率不同）
        var clients = new string?[] { null }.Concat(FallbackClients.Select(c => (string?)c));
        foreach (var client in clients)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                return await FetchInfoCoreAsync(url, proxy, cookieFile, client, log, ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested
                && ex.Message.Contains("Sign in to confirm", StringComparison.OrdinalIgnoreCase))
            {
                lastEx = ex;
                log?.Report($"[重试] 客户端({client ?? "默认"})被风控拦截，换下一个...");
            }
        }
        throw lastEx ?? new InvalidOperationException("解析失败");
    }

    private async Task<VideoInfo> FetchInfoCoreAsync(string url, string? proxy, string? cookieFile,
        string? playerClient, IProgress<string>? log, CancellationToken ct)
    {
        var args = BaseArgs(proxy, cookieFile);
        if (playerClient != null)
            args.AddRange(["--extractor-args", $"\"youtube:player_client={playerClient}\""]);
        args.Add("-J");
        args.Add("--no-playlist");
        args.Add($"\"{url}\"");
        var (stdout, _, code, errTail) = await RunAsync(YtDlpPath, args, log, ct, p => _infoProc = p);
        if (code != 0 || string.IsNullOrWhiteSpace(stdout))
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(errTail) ? $"yt-dlp 退出码 {code}" : errTail);

        using var doc = JsonDocument.Parse(stdout);
        var root = doc.RootElement;
        var info = new VideoInfo
        {
            Id = GetString(root, "id"),
            Title = GetString(root, "title"),
            Uploader = GetString(root, "uploader") is { Length: > 0 } u ? u : GetString(root, "channel"),
            Thumbnail = GetString(root, "thumbnail"),
            DurationSeconds = root.TryGetProperty("duration", out var d) && d.ValueKind == JsonValueKind.Number ? d.GetDouble() : null,
            Description = GetString(root, "description"),
            WebpageUrl = GetString(root, "webpage_url"),
            ExtractorKey = GetString(root, "extractor_key"),
        };
        if (root.TryGetProperty("formats", out var fmts) && fmts.ValueKind == JsonValueKind.Array)
        {
            foreach (var f in fmts.EnumerateArray())
            {
                if (f.ValueKind != JsonValueKind.Object) continue;
                var format = new VideoFormat
                {
                    FormatId = GetString(f, "format_id"),
                    Ext = GetString(f, "ext"),
                    Resolution = GetString(f, "resolution"),
                    Fps = f.TryGetProperty("fps", out var fps) && fps.ValueKind == JsonValueKind.Number ? fps.GetDouble().ToString("0") : null,
                    Vcodec = GetString(f, "vcodec"),
                    Acodec = GetString(f, "acodec"),
                    FilesizeText = GetString(f, "filesize_string") ?? GetString(f, "filesize_pretty"),
                    Tbr = f.TryGetProperty("tbr", out var tbr) && tbr.ValueKind == JsonValueKind.Number ? tbr.GetDouble() : null,
                };
                if (format.FormatId.Length > 0 && (format.HasVideo || format.HasAudio))
                    info.Formats.Add(format);
            }
        }
        return info;
    }

    public async Task DownloadAsync(DownloadRequest req, IProgress<DownloadProgress>? progress,
        IProgress<string>? log, CancellationToken ct)
    {
        if (!ToolsExist()) throw new InvalidOperationException("yt-dlp.exe 未就绪。");
        var args = BaseArgs(req.Proxy, req.CookieFile);

        args.AddRange(["--newline", "--no-mtime", "--restrict-filenames",
            "--progress-template", "download:PROGRESS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes_estimate)s"]);

        args.AddRange(["-P", $"\"{req.OutputDir}\"", "-o",
            $"\"{req.OutputTemplate ?? "%(title).80s [%(id)s].%(ext)s"}\""]);

        if (req.IsPlaylist && req.PlaylistLimit is > 0)
            args.AddRange(["--yes-playlist", "--playlist-end", req.PlaylistLimit.Value.ToString()]);
        else
            args.Add("--no-playlist");

        if (req.AudioOnly)
        {
            args.AddRange(["-x", "--audio-format", req.AudioFormat is { Length: > 0 } ? req.AudioFormat : "mp3",
                "--audio-quality", "0"]);
        }
        else
        {
            args.AddRange(["-f", req.FormatArg, "--merge-output-format", "mp4"]);
        }

        if (req.WriteThumbnail)
            args.Add("--write-thumbnail");

        if (req.TranslateToChinese)
        {
            // 两阶段：先单独拉字幕(YouTube的timedtext接口对连续请求429限流,失败带重试)，
            // 成功后再下载视频,避免字幕请求被视频流程淹没
            await DownloadSubtitlesSeparatelyAsync(req, log, ct);
            // 字幕已落盘,视频下载阶段不再要字幕
        }
        else if (!string.IsNullOrWhiteSpace(req.SubtitleLangs))
        {
            args.AddRange(["--write-subs", "--write-auto-subs", "--sub-langs", $"\"{req.SubtitleLangs}\"", "--convert-subs", "srt"]);
        }

        args.Add($"\"{req.Url}\"");

        Directory.CreateDirectory(req.OutputDir);
        log?.Report("CMD: yt-dlp " + string.Join(' ', args));

        var (code, errTail) = await RunDownloadAsync(YtDlpPath, args, progress, log, ct);
        if (ct.IsCancellationRequested) return;
        if (code != 0 && errTail.Contains("Sign in to confirm", StringComparison.OrdinalIgnoreCase))
        {
            // 风控拦截，依次换客户端重试
            foreach (var client in FallbackClients)
            {
                if (ct.IsCancellationRequested) return;
                log?.Report($"[重试] 下载被风控拦截，改用 {client} 客户端...");
                var retryArgs = new List<string>(args);
                retryArgs.InsertRange(retryArgs.Count - 1, ["--extractor-args", $"\"youtube:player_client={client}\""]);
                var (code2, errTail2) = await RunDownloadAsync(YtDlpPath, retryArgs, progress, log, ct);
                if (ct.IsCancellationRequested) return;
                if (code2 == 0) return;
                if (!errTail2.Contains("Sign in to confirm", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException(string.IsNullOrWhiteSpace(errTail2) ? $"yt-dlp 退出码 {code2}" : errTail2);
            }
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(errTail) ? $"yt-dlp 退出码 {code}" : errTail);
        }
        if (code != 0)
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(errTail) ? $"yt-dlp 退出码 {code}" : errTail);
    }

    private async Task DownloadSubtitlesSeparatelyAsync(DownloadRequest req, IProgress<string>? log, CancellationToken ct)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var args = BaseArgs(req.Proxy, req.CookieFile);
            args.AddRange(["--skip-download", "--no-playlist", "--newline", "--restrict-filenames",
                "--write-subs", "--write-auto-subs",
                "--sub-langs", "\"zh-Hans,zh,zh-CN\"",
                "--convert-subs", "srt",
                "-P", $"\"{req.OutputDir}\"",
                "-o", $"\"{req.OutputTemplate ?? "%(title).80s [%(id)s].%(ext)s"}\"",
                $"\"{req.Url}\""]);
            log?.Report($"[字幕] 第 {attempt} 次尝试获取中文字幕...");
            var (stdout, _, code, errTail) = await RunAsync(YtDlpPath, args, log, ct, _ => { });
            if (ct.IsCancellationRequested) return;
            var srtExists = Directory.GetFiles(req.OutputDir, "*.srt").Length > 0;
            if (code == 0 && srtExists)
            {
                log?.Report("[字幕] 中文字幕获取成功");
                return;
            }
            if (attempt < maxAttempts)
            {
                var wait = attempt * 20;
                log?.Report($"[字幕] 未成功({(errTail.Contains("429") ? "限流" : "无可用字幕或出错")}), {wait}s 后重试");
                await Task.Delay(TimeSpan.FromSeconds(wait), ct);
            }
            else
            {
                log?.Report("[字幕] 已尝试多次仍未获取到中文字幕(该视频可能无中文/机翻字幕)");
            }
        }
    }

    private async Task<(int code, string errTail)> RunDownloadAsync(string exe, List<string> args,
        IProgress<DownloadProgress>? progress, IProgress<string>? log, CancellationToken ct)
    {
        // PyInstaller 偶发 "Failed to load Python DLL" 启动失败，自动重试一次
        for (var attempt = 0; ; attempt++)
        {
            var r = await RunDownloadOnceAsync(exe, args, progress, log, ct);
            if (attempt >= 1 || !r.dllFail) return (r.code, r.errTail);
            log?.Report("[重试] yt-dlp 启动异常(已知偶发问题)，自动重试...");
            await Task.Delay(1500, ct);
        }
    }

    private async Task<(int code, string errTail, bool dllFail)> RunDownloadOnceAsync(string exe, List<string> args,
        IProgress<DownloadProgress>? progress, IProgress<string>? log, CancellationToken ct)
    {
        var dllFail = false;
        var psi = MakePsi(exe, args);
        using var proc = new Process { StartInfo = psi };
        var errSb = new StringBuilder();
        var lastErrLine = "";
        proc.Start();
        _dlProc = proc;
        var outTask = ReadLinesAsync(proc.StandardOutput, line =>
        {
            if (line.StartsWith("PROGRESS|"))
            {
                var parts = line.Split('|');
                if (parts.Length >= 6)
                {
                    var pct = ParsePct(parts[1]);
                    progress?.Report(new DownloadProgress
                    {
                        Stage = "下载中",
                        Percent = pct,
                        Speed = parts[2].Trim(),
                        Eta = parts[3].Trim(),
                    });
                }
                return;
            }
            if (line.StartsWith("[download]") && line.Contains("%"))
            {
                var m = PercentRegex().Match(line);
                if (m.Success)
                {
                    var pct = double.TryParse(m.Groups[1].Value, out var v) ? v : (double?)null;
                    var speed = line.Contains("at ") ? line[(line.IndexOf("at ") + 3)..].Split(' ')[0] : "";
                    progress?.Report(new DownloadProgress { Stage = "下载中", Percent = pct, Speed = speed });
                }
                return;
            }
            if (line.StartsWith("[Merger]") || line.StartsWith("[ExtractAudio]"))
            {
                var stage = line.StartsWith("[Merger]") ? "合并中" : "提取音频";
                progress?.Report(new DownloadProgress { Stage = stage, Info = line });
                log?.Report(line);
                return;
            }
            if (line.StartsWith("[download] Destination"))
            {
                progress?.Report(new DownloadProgress { Stage = "下载中", Title = line });
            }
            log?.Report(line);
        }, ct);
        var errTask = ReadLinesAsync(proc.StandardError, line =>
        {
            lock (errSb) { errSb.AppendLine(line); lastErrLine = line; }
            log?.Report("[stderr] " + line);
            if (line.Contains("Failed to load Python DLL", StringComparison.OrdinalIgnoreCase))
                dllFail = true;
        }, ct);
        await Task.WhenAll(outTask, errTask);
        await proc.WaitForExitAsync(ct);
        _dlProc = null;
        return (proc.ExitCode, lastErrLine, dllFail);
    }

    private static double? ParsePct(string s)
    {
        s = s.Trim().TrimEnd('%');
        return double.TryParse(s, out var v) ? v : null;
    }

    private static ProcessStartInfo MakePsi(string exe, List<string> args)
    {
        var psi = new ProcessStartInfo
        {
            FileName = exe,
            Arguments = string.Join(' ', args),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        return psi;
    }

    private async Task<(string stdout, string stderr, int code, string errTail)> RunAsync(
        string exe, List<string> args, IProgress<string>? log, CancellationToken ct, Action<Process?> register)
    {
        // PyInstaller 偶发 "Failed to load Python DLL" 启动失败，自动重试一次
        for (var attempt = 0; ; attempt++)
        {
            var result = await RunOnceAsync(exe, args, log, ct, register);
            if (attempt >= 1 || !result.stderr.Contains("Failed to load Python DLL", StringComparison.OrdinalIgnoreCase))
                return result;
            log?.Report("[重试] yt-dlp 启动异常(已知偶发问题)，自动重试...");
            await Task.Delay(1500, ct);
        }
    }

    private async Task<(string stdout, string stderr, int code, string errTail)> RunOnceAsync(
        string exe, List<string> args, IProgress<string>? log, CancellationToken ct, Action<Process?> register)
    {
        var psi = MakePsi(exe, args);
        using var proc = new Process { StartInfo = psi };
        var stdoutSb = new StringBuilder();
        var errSb = new StringBuilder();
        var lastErrLine = "";
        proc.Start();
        register(proc);
        var outTask = ReadLinesAsync(proc.StandardOutput, line => { lock (stdoutSb) stdoutSb.AppendLine(line); }, ct);
        var errTask = ReadLinesAsync(proc.StandardError, line =>
        {
            lock (errSb) { errSb.AppendLine(line); lastErrLine = line; }
            if (line.Contains("ERROR")) log?.Report("[stderr] " + line);
        }, ct);
        await Task.WhenAll(outTask, errTask);
        await proc.WaitForExitAsync(ct);
        return (stdoutSb.ToString(), errSb.ToString(), proc.ExitCode, lastErrLine);
    }

    private static async Task ReadLinesAsync(StreamReader reader, Action<string> onLine, CancellationToken ct)
    {
        while (true)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line is null) break;
            if (line.Length > 0) onLine(line);
        }
    }

    private static string GetString(JsonElement obj, string prop)
        => obj.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

    [GeneratedRegex(@"(\d+(?:\.\d+)?)%")]
    private static partial Regex PercentRegex();

    // ---------- tools management ----------

    public async Task EnsureToolsAsync(bool force, string? proxy, IProgress<string>? log,
        IProgress<ToolsProgress>? progress, CancellationToken ct)
    {
        Directory.CreateDirectory(ToolsDir);
        if (!force && File.Exists(YtDlpPath) && File.Exists(FfmpegPath))
        {
            log?.Report($"工具已就绪：{YtDlpPath}");
            return;
        }

        var sem = new SemaphoreSlim(1, 1);
        await sem.WaitAsync(ct);
        try
        {
            if (!force && File.Exists(YtDlpPath) && File.Exists(FfmpegPath)) return;

            if (force || !File.Exists(YtDlpPath))
            {
                log?.Report("下载 yt-dlp.exe (latest) ...");
                var url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
                await DownloadFileAsync(url, YtDlpPath + ".tmp", proxy, progress, "yt-dlp.exe", ct);
                File.Move(YtDlpPath + ".tmp", YtDlpPath, true);
                log?.Report("yt-dlp.exe 完成");
            }

            if (force || !File.Exists(FfmpegPath))
            {
                log?.Report("下载 ffmpeg (gyan.dev essentials) ...");
                var url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
                var zipPath = Path.Combine(ToolsDir, "ffmpeg.zip");
                await DownloadFileAsync(url, zipPath, proxy, progress, "ffmpeg.zip", ct);
                ExtractFfmpeg(zipPath);
                log?.Report("ffmpeg.exe 完成");
            }
        }
        finally { sem.Release(); }
    }

    private void ExtractFfmpeg(string zipPath)
    {
        System.IO.Compression.ZipFile.ExtractToDirectory(zipPath, ToolsDir, overwriteFiles: true);
        // find ffmpeg.exe in extracted tree, move to ToolsDir root
        var found = Directory.EnumerateFiles(ToolsDir, "ffmpeg.exe", SearchOption.AllDirectories)
            .FirstOrDefault(p => !p.Equals(FfmpegPath, StringComparison.OrdinalIgnoreCase));
        if (found is null) throw new InvalidOperationException("ffmpeg 压缩包中没有 ffmpeg.exe");
        if (!found.Equals(FfmpegPath, StringComparison.OrdinalIgnoreCase))
            File.Copy(found, FfmpegPath, true);
        try { File.Delete(zipPath); } catch { }
        // clean extracted folder
        var dirs = Directory.GetDirectories(ToolsDir);
        foreach (var d in dirs)
        {
            if (!d.EndsWith("tools")) { try { Directory.Delete(d, true); } catch { } }
        }
    }

    private async Task DownloadFileAsync(string url, string destPath, string? proxy,
        IProgress<ToolsProgress>? progress, string name, CancellationToken ct)
    {
        var handler = new HttpClientHandler { AllowAutoRedirect = true };
        if (!string.IsNullOrWhiteSpace(proxy)) handler.Proxy = new WebProxy(proxy) { UseDefaultCredentials = true };
        using var http = new HttpClient(handler) { Timeout = TimeSpan.FromMinutes(20) };
        using var resp = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        resp.EnsureSuccessStatusCode();
        var total = resp.Content.Headers.ContentLength ?? 0;
        await using var src = await resp.Content.ReadAsStreamAsync(ct);
        await using var dst = new FileStream(destPath, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 16, useAsync: true);
        var buf = new byte[1 << 16];
        long current = 0;
        int n;
        while ((n = await src.ReadAsync(buf, ct)) > 0)
        {
            await dst.WriteAsync(buf.AsMemory(0, n), ct);
            current += n;
            progress?.Report(new ToolsProgress { Name = name, Current = current, Total = total });
        }
        progress?.Report(new ToolsProgress { Name = name, Current = total, Total = total, Done = true });
    }

    public async Task<(string output, int code)> RunYtDlpVersionAsync(string? proxy, CancellationToken ct)
    {
        var args = BaseArgs(proxy, null);
        args.Add("--version");
        var (stdout, _, code, _) = await RunAsync(YtDlpPath, args, null, ct, _ => { });
        return (stdout.Trim(), code);
    }

    public async Task<string> UpdateYtDlpAsync(string? proxy, IProgress<string>? log, CancellationToken ct)
    {
        var args = BaseArgs(proxy, null);
        args.Add("-U");
        var (stdout, _, code, errTail) = await RunAsync(YtDlpPath, args, log, ct, _ => { });
        return code == 0 ? stdout : $"更新失败: {errTail}";
    }
}
