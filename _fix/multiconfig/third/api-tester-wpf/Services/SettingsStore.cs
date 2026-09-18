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

        /// <summary>最近一次成功读到配置的来源路径；为 null 表示本次没读到任何历史配置。</summary>
        public string? LoadedFromPath { get; private set; }

        private static readonly string[] CandidateDirectories =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ApiTester"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ApiTester"),
            Path.Combine(AppContext.BaseDirectory, "config")
        };

        public SettingsStore()
        {
            FilePath = ResolveWritablePath();
        }

        private static string? ResolveWritablePath()
        {
            foreach (var directory in CandidateDirectories)
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
            // 先读本次会话认定的可写路径，再把其余候选目录整个扫一遍。
            // 运行环境一变（受限目录突然不可写），写路径就会漂移到程序目录，
            // 而旧配置还留在 %APPDATA% —— 只认一个路径时，表现就是"能保存、读不回来"。
            var paths = new List<string>();
            if (!string.IsNullOrWhiteSpace(FilePath))
            {
                paths.Add(FilePath!);
            }

            foreach (var directory in CandidateDirectories)
            {
                if (string.IsNullOrWhiteSpace(directory))
                {
                    continue;
                }

                var candidate = Path.Combine(directory, "settings.json");
                if (!paths.Exists(existing => string.Equals(existing, candidate, StringComparison.OrdinalIgnoreCase)))
                {
                    paths.Add(candidate);
                }
            }

            // 光靠"文件存在"决定读哪份是不够的：程序目录里那份可能是环境受限时落下的旧配置，
            // 里面密钥为空、网址是上一个服务。它存在，就会把用户真正填好的那份永远挡在后面。
            // 所以这里把所有候选都解析出来，按内容完整度打分，取最好的那份。
            AppSettings? best = null;
            string? bestPath = null;
            var bestScore = -1;

            foreach (var candidate in paths)
            {
                var settings = TryLoad(candidate);
                if (settings is null)
                {
                    continue;
                }

                var score = ScoreOf(settings);
                if (score > bestScore)
                {
                    best = settings;
                    bestPath = candidate;
                    bestScore = score;
                }
            }

            LoadedFromPath = bestPath;
            return best;
        }

        /// <summary>内容越完整分数越高；密钥权重最大，其次是网址与模型。</summary>
        private static int ScoreOf(AppSettings settings)
        {
            var score = 0;
            if (!string.IsNullOrWhiteSpace(settings.ApiKey)) { score += 4; }
            if (!string.IsNullOrWhiteSpace(settings.BaseUrl)) { score += 2; }
            if (!string.IsNullOrWhiteSpace(settings.SelectedModel)) { score += 1; }
            return score;
        }

        private static AppSettings? TryLoad(string path)
        {
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

            var saved = TryWrite(path, settings);

            // 其余候选位置只要已经有文件，就一并刷新成同一份内容，
            // 免得下次启动时两处内容不一致、又按打分选中过期的那一份。
            foreach (var directory in CandidateDirectories)
            {
                if (string.IsNullOrWhiteSpace(directory))
                {
                    continue;
                }

                var mirror = Path.Combine(directory, "settings.json");
                if (string.Equals(mirror, path, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (File.Exists(mirror))
                {
                    TryWrite(mirror, settings);
                }
            }

            return saved;
        }

        private static bool TryWrite(string path, AppSettings settings)
        {
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
