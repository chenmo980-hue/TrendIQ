using System.Windows;

namespace TrendIQDownloader;

public partial class SettingsDialog : Window
{
    private readonly MainViewModel _vm;
    public SettingsDialog(MainViewModel vm)
    {
        _vm = vm;
        InitializeComponent();
        var s = vm.GetSettings();
        ProxyBox.Text = s.Proxy;
        CookieBox.Text = s.CookieFile;
        SubLangBox.Text = s.SubtitleLangs;
        OutputBox.Text = s.OutputDir;
    }

    private void OnSave(object sender, RoutedEventArgs e)
    {
        var s = _vm.GetSettings();
        s.Proxy = ProxyBox.Text.Trim();
        s.CookieFile = CookieBox.Text.Trim();
        s.SubtitleLangs = SubLangBox.Text.Trim();
        s.OutputDir = OutputBox.Text.Trim();
        _vm.SaveSettings(s);
        Close();
    }

    private void OnClose(object sender, RoutedEventArgs e) => Close();

    private void OnBrowseCookie(object sender, RoutedEventArgs e)
    {
        var dlg = new Microsoft.Win32.OpenFileDialog { Filter = "Cookie 文件|*.txt|所有文件|*.*" };
        if (dlg.ShowDialog(this) == true) CookieBox.Text = dlg.FileName;
    }

    private void OnBrowseOutput(object sender, RoutedEventArgs e)
    {
        var dlg = new Microsoft.Win32.OpenFolderDialog();
        if (dlg.ShowDialog(this) == true) OutputBox.Text = dlg.FolderName;
    }
}
