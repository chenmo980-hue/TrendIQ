using System.IO;
using System.Windows;
using System.Windows.Input;
using TrendIQDownloader.Models;

namespace TrendIQDownloader;

public partial class MainWindow : Window
{
    private readonly MainViewModel _vm = new();
    private CancellationTokenSource _parseCts = new();

    public MainWindow()
    {
        InitializeComponent();
        DataContext = _vm;
        Loaded += async (_, _) => { if (!_vm.GetSettings().SkipAutoToolCheck) await _vm.EnsureToolsAsync(false, CancellationToken.None); };
        Closing += (_, _) => _vm.PauseAll();
        _vm.PropertyChanged += (s, e) =>
        {
            if (e.PropertyName == nameof(MainViewModel.LogText))
                Dispatcher.BeginInvoke(() =>
                {
                    if (LogBox.Text.Length > 0)
                    {
                        LogBox.Focus();
                        LogBox.CaretIndex = LogBox.Text.Length;
                        LogBox.ScrollToEnd();
                    }
                }, System.Windows.Threading.DispatcherPriority.Background);
        };
    }

    private async void OnParse(object sender, RoutedEventArgs e) => await DoParseAsync();

    private void OnPaste(object sender, RoutedEventArgs e)
    {
        try
        {
            var text = Clipboard.GetText().Trim();
            if (text.Length > 0)
            {
                _vm.Url = text;
                UrlBox.Text = text;
                _vm.StatusText = "已粘贴链接，点「解析」";
            }
        }
        catch { }
        UrlBox.Focus();
    }

    private void OnUrlAreaClick(object sender, MouseButtonEventArgs e) => UrlBox.Focus();

    private async Task DoParseAsync()
    {
        var url = _vm.Url?.Trim();
        if (string.IsNullOrEmpty(url))
        {
            _vm.StatusText = "请输入链接";
            return;
        }
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            _vm.StatusText = "链接需以 http(s):// 开头";
            return;
        }
        _parseCts.Cancel();
        _parseCts = new CancellationTokenSource();
        await _vm.ParseAsync(url, _parseCts.Token);
    }

    private async void UrlBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter) await DoParseAsync();
    }

    private async void OnDownload(object sender, RoutedEventArgs e)
    {
        if (_vm.CurrentInfo is null) return;
        await _vm.DownloadCurrentAsync();
    }

    private void OnThumbClick(object sender, MouseButtonEventArgs e)
    {
        if (!string.IsNullOrEmpty(_vm.CurrentInfo?.WebpageUrl))
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(_vm.CurrentInfo.WebpageUrl) { UseShellExecute = true });
    }

    private async void OnTools(object sender, RoutedEventArgs e)
    {
        var dlg = new ToolsDialog(_vm) { Owner = this };
        dlg.ShowDialog();
        await _vm.EnsureToolsAsync(false, CancellationToken.None);
    }

    private void OnCancelTask(object sender, RoutedEventArgs e)
    {
        if (e.OriginalSource is FrameworkElement { Tag: TaskItem t }) _vm.CancelTask(t);
    }

    private void OnOpenFile(object sender, RoutedEventArgs e)
    {
        if (e.OriginalSource is FrameworkElement { Tag: TaskItem t }) _vm.OpenFile(t);
    }

    private void OnPauseAll(object sender, RoutedEventArgs e) => _vm.PauseAll();

    private void OnBrowseOutput(object sender, RoutedEventArgs e)
    {
        var dlg = new Microsoft.Win32.OpenFolderDialog { Title = "选择下载目录" };
        if (dlg.ShowDialog(this) == true)
        {
            var s = _vm.GetSettings();
            s.OutputDir = dlg.FolderName;
            _vm.SaveSettings(s);
            _vm.StatusText = "下载目录: " + s.OutputDir;
        }
    }

    private void OnSettings(object sender, RoutedEventArgs e)
    {
        var dlg = new SettingsDialog(_vm) { Owner = this };
        dlg.ShowDialog();
    }

    private void OnOpenOutputDir(object sender, RoutedEventArgs e)
    {
        try
        {
            var dir = _vm.GetSettings().OutputDir;
            if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(dir) { UseShellExecute = true });
            else
                _vm.StatusText = "下载目录不存在";
        }
        catch (Exception ex) { _vm.StatusText = "打开失败: " + ex.Message; }
    }

    private void OnCopyLog(object sender, RoutedEventArgs e)
    {
        try
        {
        var log = _vm.LogText;
        if (!string.IsNullOrEmpty(log))
        {
            Clipboard.SetText(log);
            _vm.StatusText = "日志已复制到剪贴板";
        }
        }
        catch { }
    }

    private void OnSelectAllLog(object sender, RoutedEventArgs e)
    {
        LogBox.SelectAll();
    }
}
