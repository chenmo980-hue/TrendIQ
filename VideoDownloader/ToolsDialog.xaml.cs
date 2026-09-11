using System.IO;
using System.Windows;
using TrendIQDownloader.Models;
using TrendIQDownloader.Services;
using System.Windows.Threading;

namespace TrendIQDownloader;

public partial class ToolsDialog : Window
{
    private readonly MainViewModel _vm;
    private readonly YtDlpService _svc;

    public ToolsDialog(MainViewModel vm)
    {
        _vm = vm;
        _svc = new YtDlpService();
        InitializeComponent();
        RefreshStatus();
    }

    private void RefreshStatus()
    {
        var hasYt = File.Exists(_svc.YtDlpPath);
        var hasFf = File.Exists(_svc.FfmpegPath);
        StatusText.Text = $"yt-dlp.exe: {(hasYt ? "已安装" : "未安装")}\n" +
                          $"ffmpeg.exe: {(hasFf ? "已安装" : "未安装")}\n" +
                          $"工具目录: {_svc.ToolsDir}" +
                          (hasYt ? $"\n版本: {_vm.YtDlpVersion}" : "");
    }

    private async void OnEnsure(object sender, RoutedEventArgs e) => await RunTools(false);

    private async void OnForce(object sender, RoutedEventArgs e) => await RunTools(true);

    private async Task RunTools(bool force)
    {
        SetBusy(true);
        var s = _vm.GetSettings();
        try
        {
            await _svc.EnsureToolsAsync(force, s.Proxy,
                new Progress<string>(msg => Dispatcher.Invoke(() => { StatusText.Text = msg; AppendLog(msg); })),
                new Progress<ToolsProgress>(p => Dispatcher.Invoke(() =>
                {
                    if (p.Total > 0)
                    {
                        Prog.Value = p.Current * 100.0 / p.Total;
                        ProgText.Text = $"{p.Name}: {p.Current / 1048576.0:0.#} / {p.Total / 1048576.0:0.#} MB";
                    }
                    else
                    {
                        Prog.IsIndeterminate = true;
                        ProgText.Text = $"{p.Name}: {p.Current / 1048576.0:0.#} MB";
                    }
                })),
                CancellationToken.None);
            Prog.IsIndeterminate = false;
            Prog.Value = 100;
            ProgText.Text = "完成";
            await _vm.EnsureToolsAsync(false, CancellationToken.None);
        }
        catch (Exception ex)
        {
            StatusText.Text = "失败: " + ex.Message;
        }
        finally
        {
            SetBusy(false);
            RefreshStatus();
        }
    }

    private async void OnUpdate(object sender, RoutedEventArgs e)
    {
        SetBusy(true);
        try
        {
            var s = _vm.GetSettings();
            var result = await _svc.UpdateYtDlpAsync(s.Proxy,
                new Progress<string>(msg => Dispatcher.Invoke(() => AppendLog(msg))), CancellationToken.None);
            StatusText.Text = result;
            await _vm.EnsureToolsAsync(false, CancellationToken.None);
        }
        catch (Exception ex) { StatusText.Text = "更新失败: " + ex.Message; }
        finally { SetBusy(false); RefreshStatus(); }
    }

    private void AppendLog(string msg) => StatusText.Text = msg;

    private void SetBusy(bool busy)
    {
        BtnEnsure.IsEnabled = !busy;
        BtnForce.IsEnabled = !busy;
        BtnUpdate.IsEnabled = !busy;
        if (busy) { Prog.Value = 0; Prog.IsIndeterminate = false; }
    }

    private void OnClose(object sender, RoutedEventArgs e) => Close();
}
