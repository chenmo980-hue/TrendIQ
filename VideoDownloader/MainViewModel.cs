using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using TrendIQDownloader.Models;
using TrendIQDownloader.Services;

namespace TrendIQDownloader;

public class TaskItem : INotifyPropertyChanged
{
    public string Title { get; set; } = "";
    public string Url { get; set; } = "";
    private string _status = "排队中";
    public string Status
    {
        get => _status;
        set { _status = value; Notify(); }
    }
    private double _percent;
    public double Percent { get => _percent; set { _percent = value; Notify(); } }
    private string _speed = "";
    public string Speed { get => _speed; set { _speed = value; Notify(); } }
    public CancellationTokenSource Cts { get; } = new();
    public bool CanCancel => Status is "排队中" or "下载中" or "解析中" or "合并中" or "提取音频";
    public bool CanOpen => Status is "已完成";
    public string OutputDir { get; set; } = "";

    public System.Windows.Media.Brush StatusBrush => Status switch
    {
        "已完成" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x2F, 0xB3, 0x77)),
        "已取消" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x5C, 0x61, 0x69)),
        "失败" => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0xE0, 0x6C, 0x6C)),
        _ => new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0x6C, 0x8C, 0xFF)),
    };

    public string ProgressText => Status switch
    {
        "已完成" => "100%",
        "已取消" => "已取消",
        "失败" => "失败",
        _ => Percent > 0 ? $"{Percent:0.#}%" : "-",
    };

    public event PropertyChangedEventHandler? PropertyChanged;
    public void Notify([CallerMemberName] string? name = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
        if (name == nameof(Status))
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(CanCancel)));
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(CanOpen)));
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(ProgressText)));
        }
        if (name == nameof(Percent))
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(ProgressText)));
    }
}

public class MainViewModel : INotifyPropertyChanged
{
    private readonly YtDlpService _dlp = new();
    private readonly SettingsService _settingsSvc = new();
    private SettingsData _settings;

    public ObservableCollection<TaskItem> Tasks { get; } = new();
    public ObservableCollection<VideoFormat> Formats { get; } = new();
    public ObservableCollection<string> AudioFormats { get; } = new() { "mp3", "m4a", "opus", "flac", "wav" };

    public string Url { get; set; } = "";
    public VideoFormat? SelectedFormat { get; set; }
    public bool AudioOnly { get; set; }
    public string SelectedAudioFormat { get; set; } = "mp3";
    public bool DownloadSubs { get; set; }
    public bool DownloadThumb { get; set; }
    public bool TranslateToChinese { get; set; } = true;

    private string _title = "";
    public string Title { get => _title; set => Set(ref _title, value); }

    private string _uploader = "";
    public string Uploader { get => _uploader; set => Set(ref _uploader, value); }

    private string _durationText = "-";
    public string DurationText { get => _durationText; set => Set(ref _durationText, value); }

    private string _site = "";
    public string Site { get => _site; set => Set(ref _site, value); }

    private ImageSource? _thumbnailImage;
    public ImageSource? ThumbnailImage { get => _thumbnailImage; set => Set(ref _thumbnailImage, value); }

    public Visibility InfoVisibility => _hasInfo ? Visibility.Visible : Visibility.Collapsed;

    private bool _hasInfo;
    public bool HasInfo { get => _hasInfo; set { _hasInfo = value; Notify(); Notify(nameof(InfoVisibility)); } }

    private bool _busy;
    public bool Busy { get => _busy; set { _busy = value; Notify(); Notify(nameof(NotBusy)); } }
    public bool NotBusy => !Busy;

    private string _statusText = "就绪";
    public string StatusText { get => _statusText; set => Set(ref _statusText, value); }

    private string _ytDlpVersion = "";
    public string YtDlpVersion { get => _ytDlpVersion; set => Set(ref _ytDlpVersion, value); }

    private string _logText = "";
    public string LogText { get => _logText; set => Set(ref _logText, value); }

    public Visibility PauseAllVisibility => Tasks.Any(t => t.CanCancel) ? Visibility.Visible : Visibility.Collapsed;
    public Visibility TasksEmptyHintVisibility => Tasks.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

    public VideoInfo? CurrentInfo { get; private set; }

    public event PropertyChangedEventHandler? PropertyChanged;

    private void Set<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return;
        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name!));
    }

    private void Notify([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name!));

    public MainViewModel()
    {
        _settings = _settingsSvc.Load();
        if (!Directory.Exists(_settings.OutputDir))
            _settings.OutputDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
        _ = InitAsync();
    }

    private async Task InitAsync()
    {
        try
        {
            if (_dlp.ToolsExist())
            {
                var (ver, code) = await _dlp.RunYtDlpVersionAsync(_settings.Proxy, CancellationToken.None);
                if (code == 0) YtDlpVersion = "yt-dlp " + (ver.Length > 0 ? ver.Split('\n')[0] : "?");
            }
            else YtDlpVersion = "yt-dlp 未安装";
        }
        catch { YtDlpVersion = "yt-dlp ?"; }
    }

    public async Task EnsureToolsAsync(bool force, CancellationToken ct)
    {
        Busy = true;
        StatusText = force ? "更新工具中..." : "检查工具中...";
        try
        {
            await _dlp.EnsureToolsAsync(force, _settings.Proxy,
                new Progress<string>(s => { StatusText = s; AppendLog(s); }),
                new Progress<ToolsProgress>(p =>
                {
                    var mb = p.Total > 0 ? $" ({p.Current / 1048576.0:0.#}/{p.Total / 1048576.0:0.#}MB)" : $" ({p.Current / 1048576.0:0.#}MB)";
                    StatusText = $"下载 {p.Name}{mb}{(p.Done ? " ✓" : "")}";
                }), ct);
            var (ver, code) = await _dlp.RunYtDlpVersionAsync(_settings.Proxy, ct);
            if (code == 0) YtDlpVersion = "yt-dlp " + (ver.Length > 0 ? ver.Split('\n')[0] : "?");
            StatusText = "工具就绪";
        }
        catch (Exception ex)
        {
            AppendLog("工具下载失败: " + ex.Message);
            StatusText = "工具下载失败（可检查代理设置）";
        }
        finally { Busy = false; }
    }

    public async Task ParseAsync(string url, CancellationToken ct)
    {
        Busy = true;
        StatusText = "解析中...";
        HasInfo = false;
        try
        {
            var info = await _dlp.FetchInfoAsync(url, _settings.Proxy, _settings.CookieFile,
                new Progress<string>(s => AppendLog(s)), ct);
            CurrentInfo = info;
            Title = info.Title;
            Uploader = info.Uploader;
            DurationText = info.DurationText;
            Site = info.Site;
            Formats.Clear();
            foreach (var f in info.Formats.AsEnumerable().Reverse())
                Formats.Add(f);
            var best = Formats.FirstOrDefault(f => f.HasVideo && f.HasAudio)
                       ?? Formats.FirstOrDefault(f => f.HasVideo)
                       ?? Formats.FirstOrDefault();
            SelectedFormat = best;
            Notify(nameof(SelectedFormat));
            _ = LoadThumbnailAsync(info.Thumbnail);
            HasInfo = true;
            StatusText = "解析完成，请选择格式";
        }
        catch (OperationCanceledException) { StatusText = "已取消解析"; }
        catch (Exception ex)
        {
            AppendLog("解析失败: " + ex.Message);
            StatusText = "解析失败: " + ex.Message;
        }
        finally { Busy = false; }
    }

    private async Task LoadThumbnailAsync(string? url)
    {
        if (string.IsNullOrEmpty(url)) return;
        try
        {
            var handler = new System.Net.Http.HttpClientHandler { AllowAutoRedirect = true };
            if (!string.IsNullOrWhiteSpace(_settings.Proxy))
                handler.Proxy = new System.Net.WebProxy(_settings.Proxy);
            using var http = new System.Net.Http.HttpClient(handler);
            var bytes = await http.GetByteArrayAsync(url);
            var img = new BitmapImage();
            using var ms = new MemoryStream(bytes);
            img.BeginInit();
            img.CacheOption = BitmapCacheOption.OnLoad;
            img.StreamSource = ms;
            img.EndInit();
            img.Freeze();
            ThumbnailImage = img;
        }
        catch { }
    }

    public async Task DownloadCurrentAsync()
    {
        if (CurrentInfo is null) return;
        var formatArg = AudioOnly
            ? ""
            : SelectedFormat is { HasVideo: true, HasAudio: false } f
                ? $"{f.FormatId}+bestaudio/{f.FormatId}"
                : SelectedFormat is { HasVideo: true, HasAudio: true } f2 ? f2.FormatId
                : "bestaudio/best";

        var task = new TaskItem
        {
            Title = AudioOnly ? $"[音频] {Title}" : Title,
            Url = Url,
            Status = "下载中",
            OutputDir = _settings.OutputDir,
        };
        Tasks.Add(task);
        Notify(nameof(PauseAllVisibility));
        Notify(nameof(TasksEmptyHintVisibility));
        AppendLog($"开始下载: {task.Title}");

        var req = new DownloadRequest
        {
            Url = Url,
            OutputDir = _settings.OutputDir,
            FormatArg = string.IsNullOrEmpty(formatArg) ? "bestaudio/best" : formatArg,
            AudioOnly = AudioOnly,
            AudioFormat = SelectedAudioFormat,
            Proxy = _settings.Proxy,
            CookieFile = _settings.CookieFile,
            SubtitleLangs = DownloadSubs ? GetSubLangs() : null,
            WriteThumbnail = DownloadThumb,
            TranslateToChinese = TranslateToChinese,
        };

        var progress = new Progress<DownloadProgress>(p =>
        {
            task.Status = p.Stage;
            if (p.Percent is { } pct) task.Percent = pct;
            if (!string.IsNullOrEmpty(p.Speed)) task.Speed = p.Speed;
            task.Notify();
        });
        try
        {
            await _dlp.DownloadAsync(req, progress, new Progress<string>(s => AppendLog(s)), task.Cts.Token);
            task.Status = "已完成";
            task.Percent = 100;
            task.Speed = "";
            AppendLog("完成: " + task.Title);
            if (TranslateToChinese)
            {
                task.Status = "转写文本";
                task.Notify();
                try
                {
                    var txt = SrtToTextService.GenerateTextForVideo(LastVideoPath(task.OutputDir));
                    if (txt != null)
                    {
                        AppendLog("中文字幕文本已生成: " + Path.GetFileName(txt));
                        task.Status = "已完成";
                    }
                    else
                    {
                        AppendLog("未找到可用字幕（该视频无中文/机翻字幕）");
                        task.Status = "已完成";
                    }
                }
                catch (Exception ex) { AppendLog("字幕转文本失败: " + ex.Message); task.Status = "已完成"; }
            }
        }
        catch (OperationCanceledException)
        {
            task.Status = "已取消";
            task.Speed = "";
            AppendLog("已取消: " + task.Title);
        }
        catch (Exception ex)
        {
            task.Status = "失败";
            task.Speed = "";
            AppendLog("失败: " + ex.Message);
        }
        finally
        {
            task.Notify();
            Notify(nameof(PauseAllVisibility));
        }
    }

    public string GetSubLangs() => "zh,en";

    public void CancelTask(TaskItem task)
    {
        task.Cts.Cancel();
        task.Status = "已取消";
        task.Notify();
        Notify(nameof(PauseAllVisibility));
        Notify(nameof(TasksEmptyHintVisibility));
    }

    public void PauseAll()
    {
        foreach (var t in Tasks.Where(t => t.CanCancel))
        {
            t.Cts.Cancel();
            t.Status = "已取消";
            t.Notify();
        }
        _dlp.CancelAll();
        Notify(nameof(PauseAllVisibility));
        Notify(nameof(TasksEmptyHintVisibility));
    }

    public void OpenFile(TaskItem task)
    {
        try
        {
            var files = Directory.GetFiles(task.OutputDir, "*");
            var best = files.OrderByDescending(f => File.GetLastWriteTime(f))
                .FirstOrDefault(f => Path.GetFileName(f).Contains(Sanitize(task.Title).Split(' ')[^1]?.Split('[')[0] ?? "", StringComparison.OrdinalIgnoreCase) || true);
            if (best is null)
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(task.OutputDir) { UseShellExecute = true });
                return;
            }
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(best) { UseShellExecute = true });
        }
        catch (Exception ex) { AppendLog("打开失败: " + ex.Message); }
    }

    private static string Sanitize(string s) => s;

    private static string LastVideoPath(string outputDir)
    {
        var files = new DirectoryInfo(outputDir).GetFiles()
            .Where(f => f.Extension is ".mp4" or ".mkv" or ".webm" or ".m4a" or ".mp3" or ".opus" or ".flac" or ".wav")
            .OrderByDescending(f => f.LastWriteTimeUtc);
        return files.FirstOrDefault()?.FullName ?? "";
    }

    public void AppendLog(string line)
    {
        var stamp = DateTime.Now.ToString("HH:mm:ss");
        LogText = LogText.Length > 40000 ? $"[{stamp}] (日志截断)\n" : LogText;
        LogText += $"[{stamp}] {line}\n";
    }

    public SettingsData GetSettings() => _settings;

    public void SaveSettings(SettingsData s)
    {
        _settings = s;
        _settingsSvc.Save(s);
    }
}
