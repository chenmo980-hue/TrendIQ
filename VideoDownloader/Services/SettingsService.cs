using System.IO;
using System.Text.Json;

namespace TrendIQDownloader.Services;

public class SettingsService
{
    private static string SettingsPath => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "TrendIQDownloader", "settings.json");

    public Models.SettingsData Load()
    {
        try
        {
            if (File.Exists(SettingsPath))
            {
                var data = JsonSerializer.Deserialize<Models.SettingsData>(File.ReadAllText(SettingsPath));
                if (data != null)
                {
                    if (string.IsNullOrEmpty(data.CookieFile)) data.CookieFile = DetectBundledCookies();
                    return data;
                }
            }
        }
        catch { }
        return new Models.SettingsData
        {
            OutputDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads"),
            Proxy = DetectSystemProxy(),
            CookieFile = DetectBundledCookies(),
        };
    }

    private static string DetectBundledCookies()
    {
        try
        {
            var p = Path.Combine(AppContext.BaseDirectory, "youtube-cookies.txt");
            return File.Exists(p) ? p : "";
        }
        catch { return ""; }
    }

    private static string DetectSystemProxy()
    {
        try
        {
            using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Internet Settings");
            if (key?.GetValue("ProxyEnable") is int enabled && enabled == 1 &&
                key.GetValue("ProxyServer") is string server && !string.IsNullOrEmpty(server))
            {
                var s = server.Split(';').FirstOrDefault(p => !p.Contains('='))
                        ?? server.Split(';').FirstOrDefault(p => p.StartsWith("http="))?[5..]
                        ?? server;
                if (string.IsNullOrEmpty(s)) return "";
                return s.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? s : $"http://{s}";
            }
        }
        catch { }
        return "";
    }

    public void Save(Models.SettingsData data)
    {
        var dir = Path.GetDirectoryName(SettingsPath)!;
        Directory.CreateDirectory(dir);
        File.WriteAllText(SettingsPath, JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true }));
    }
}
