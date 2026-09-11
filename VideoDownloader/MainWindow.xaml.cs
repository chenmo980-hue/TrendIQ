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
    }

    private async void OnParse(object sender, RoutedEventArgs e) => await DoParseAsync();

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
}
