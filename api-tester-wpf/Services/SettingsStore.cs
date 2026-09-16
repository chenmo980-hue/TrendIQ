using System;
using System.IO;
using System.Text.Json;

namespace ApiTester.Wpf.Services
{
    /// <summary>可持久化的用户配置。</summary>
    public sealed class AppSettings
    {
        public string? BaseUrl { get; set; }
        public string? ApiKey { get; set; }
        public string? SelectedModel { get; set; }
        public string? MaxTokens { get; set; }
        public string? Message { get; set; }
    }

    /// <summary>
    /// 把配置读写到本地 JSON 文件。
    /// 依次尝试 %APPDATA%\ApiTester、%LOCALAPPDATA%\ApiTester、程序目录，
    /// 任何一个可用就固定用它；全部不可用时退化为"仅内存"模式，不抛异常。
    /// </summary>
    public sealed class SettingsStore
    {
        private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

        /// <summary>实际使用的配置文件路径；为 null 表示当前只能内存保存。</summary>
        public string? FilePath { get; private set; }

        public SettingsStore()
        {
            FilePath = ResolveWritablePath();
        }

        private static string? ResolveWritablePath()
        {
            var candidates = new[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ApiTester"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ApiTester"),
                Path.Combine(AppContext.BaseDirectory, "config")
            };

            foreach (var directory in candidates)
            {
                if (string.IsNullOrWhiteSpace(directory))
                {
                    continue;
                }

                try
                {
                    Directory.CreateDirectory(directory);
                    var probe = Path.Combine(directory, ".write-probe");
                    File.WriteAllText(probe, "ok");
                    File.Delete(probe);
                    return Path.Combine(directory, "settings.json");
                }
                catch
                {
                    // 该位置不可写，继续尝试下一个候选目录。
                }
            }

            return null;
        }

        public AppSettings? Load()
        {
            var path = FilePath;
            if (string.IsNullOrWhiteSpace(path))
            {
                return null;
            }

            try
            {
                if (!File.Exists(path))
                {
                    return null;
                }

                var json = File.ReadAllText(path);
                return string.IsNullOrWhiteSpace(json)
                    ? null
                    : JsonSerializer.Deserialize<AppSettings>(json);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>写入配置；成功返回 true。任何 IO 失败都只返回 false，不向上抛。</summary>
        public bool Save(AppSettings settings)
        {
            var path = FilePath;
            if (string.IsNullOrWhiteSpace(path))
            {
                return false;
            }

            try
            {
                var directory = Path.GetDirectoryName(path);
                if (!string.IsNullOrWhiteSpace(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                File.WriteAllText(path, JsonSerializer.Serialize(settings, JsonOptions));
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
