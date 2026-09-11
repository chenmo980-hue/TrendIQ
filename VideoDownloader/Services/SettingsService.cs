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
                if (data != null) return data;
            }
        }
        catch { }
        return new Models.SettingsData
        {
            OutputDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads"),
        };
    }

    public void Save(Models.SettingsData data)
    {
        var dir = Path.GetDirectoryName(SettingsPath)!;
        Directory.CreateDirectory(dir);
        File.WriteAllText(SettingsPath, JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true }));
    }
}
