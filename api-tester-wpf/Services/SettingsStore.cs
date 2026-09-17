using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

    /// <summary>配置列表中的可见项。</summary>
    public sealed class ConfigItem
    {
        public ConfigItem(string name, string filePath, bool isDefault, DateTime? lastModifiedUtc)
        {
            Name = name;
            FilePath = filePath;
            IsDefault = isDefault;
            LastModifiedUtc = lastModifiedUtc;
        }

        public string Name { get; }
        public string FilePath { get; }
        public string Path => FilePath;
        public bool IsDefault { get; }
        public DateTime? LastModifiedUtc { get; }

        public override string ToString() => Name;
    }

    /// <summary>
    /// 管理默认配置和多个具名配置。默认配置仍写入 settings.json，
    /// 具名配置保存在同一可写根目录下的 configs 子目录中。
    /// </summary>
    public sealed class SettingsStore
    {
        public const string DefaultConfigName = "默认配置";

        private const int MaxConfigNameLength = 64;
        private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
        private static readonly HashSet<char> InvalidNameChars = new(
            Path.GetInvalidFileNameChars()
                .Concat(new[] { '/', '\\', ':', '*', '?', '"', '<', '>', '|' })
                .Concat(Enumerable.Range(0, 32).Select(code => (char)code)));

        /// <summary>实际使用的默认配置文件路径；为 null 表示当前只能内存保存。</summary>
        public string? FilePath { get; private set; }

        /// <summary>当前正在编辑的配置名称。</summary>
        public string? ActiveConfigName { get; private set; }

        /// <summary>当前正在编辑的配置文件路径。</summary>
        public string? ActiveFilePath => _activeFilePath ?? FilePath;

        /// <summary>最近一次成功读到配置的来源路径；为 null 表示本次没读到任何历史配置。</summary>
        public string? LoadedFromPath { get; private set; }

        private string? _activeFilePath;

        private static readonly string[] CandidateDirectories =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ApiTester"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ApiTester"),
            Path.Combine(AppContext.BaseDirectory, "config")
        };

        public SettingsStore()
        {
            FilePath = ResolveWritablePath();
            _activeFilePath = FilePath;
            ActiveConfigName = DefaultConfigName;
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

        /// <summary>读取默认配置；保留原先的多路径打分逻辑，避免环境切换后读到空配置。</summary>
        public AppSettings? Load()
        {
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
            if (bestPath is null)
            {
                _activeFilePath = FilePath;
                ActiveConfigName = DefaultConfigName;
            }
            else if (IsDefaultPath(bestPath))
            {
                _activeFilePath = bestPath;
                ActiveConfigName = DefaultConfigName;
            }
            else
            {
                // 旧版会把多个 settings.json 当作同一份默认配置；优先写回本次选定的可写路径，
                // 避免后续保存只落在某个旧环境目录，导致下次启动又读到过期内容。
                if (!string.IsNullOrWhiteSpace(FilePath))
                {
                    TryWrite(FilePath, best!);
                    _activeFilePath = FilePath;
                }
                else
                {
                    _activeFilePath = bestPath;
                }

                ActiveConfigName = DefaultConfigName;
            }

            return best;
        }

        /// <summary>列出默认配置和所有具名配置。</summary>
        public IReadOnlyList<ConfigItem> ListConfigs()
        {
            var result = new List<ConfigItem>();
            if (!string.IsNullOrWhiteSpace(FilePath))
            {
                result.Add(CreateItem(DefaultConfigName, FilePath!, true));
            }

            // 扫描所有候选根目录，环境切换后仍能找到以前保存的具名配置。
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var directory in CandidateDirectories)
            {
                if (string.IsNullOrWhiteSpace(directory))
                {
                    continue;
                }

                var configDirectory = Path.Combine(directory, "configs");
                if (!Directory.Exists(configDirectory))
                {
                    continue;
                }

                try
                {
                    foreach (var file in Directory.EnumerateFiles(configDirectory, "*.json"))
                    {
                        var name = Path.GetFileNameWithoutExtension(file);
                        if (string.IsNullOrWhiteSpace(name) || !seen.Add(name))
                        {
                            continue;
                        }

                        result.Add(CreateItem(name, file, false));
                    }
                }
                catch
                {
                    // 某个目录暂时不可读时，仍返回其他目录中的配置。
                }
            }

            return result;
        }

        /// <summary>兼容调用方使用“配置集合”这一表述。</summary>
        public IReadOnlyList<ConfigItem> GetConfigs() => ListConfigs();

        /// <summary>从当前界面内容创建一个全新的具名配置；同名配置不会被覆盖。</summary>
        public bool CreateConfig(string name, AppSettings settings)
        {
            var normalizedName = NormalizeConfigName(name);
            if (normalizedName is null || settings is null)
            {
                return false;
            }

            if (normalizedName.Equals(DefaultConfigName, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var root = GetWritableRoot();
            if (root is null)
            {
                return false;
            }

            var path = Path.Combine(root, "configs", GetSafeFileName(normalizedName) + ".json");
            if (File.Exists(path))
            {
                return false;
            }

            if (!TryWrite(path, settings))
            {
                return false;
            }

            _activeFilePath = path;
            ActiveConfigName = normalizedName;
            LoadedFromPath = path;
            return true;
        }

        /// <summary>读取指定配置并把它设为当前配置。</summary>
        public AppSettings? LoadConfig(string name)
        {
            var path = FindConfigPath(name);
            if (path is null)
            {
                LoadedFromPath = null;
                return null;
            }

            var settings = TryLoad(path);
            if (settings is null)
            {
                LoadedFromPath = null;
                return null;
            }

            _activeFilePath = path;
            ActiveConfigName = IsDefaultPath(path) ? DefaultConfigName : Path.GetFileNameWithoutExtension(path);
            LoadedFromPath = path;
            return settings;
        }

        /// <summary>兼容调用方显式使用“尝试读取”的命名。</summary>
        public bool TryLoadConfig(string name, out AppSettings? settings)
        {
            settings = LoadConfig(name);
            return settings is not null;
        }

        /// <summary>写入当前配置；默认配置继续兼容旧版镜像，具名配置只写自己的文件。</summary>
        public bool Save(AppSettings settings)
        {
            var path = ActiveFilePath;
            if (string.IsNullOrWhiteSpace(path) || settings is null)
            {
                return false;
            }

            var saved = TryWrite(path, settings);
            LoadedFromPath = path;

            // 旧版只有 settings.json；默认配置写入时刷新已存在的旧镜像，
            // 但不会把具名配置意外覆盖到默认文件。
            if (saved && IsDefaultPath(path))
            {
                foreach (var directory in CandidateDirectories)
                {
                    if (string.IsNullOrWhiteSpace(directory))
                    {
                        continue;
                    }

                    var mirror = Path.Combine(directory, "settings.json");
                    if (!string.Equals(mirror, path, StringComparison.OrdinalIgnoreCase) && File.Exists(mirror))
                    {
                        TryWrite(mirror, settings);
                    }
                }
            }

            return saved;
        }

        /// <summary>判断配置名是否已被占用。</summary>
        public bool ConfigExists(string name)
        {
            return ListConfigs().Any(item => item.Name.Equals(NormalizeConfigName(name) ?? string.Empty, StringComparison.OrdinalIgnoreCase));
        }

        private static ConfigItem CreateItem(string name, string path, bool isDefault)
        {
            DateTime? modified = null;
            try
            {
                if (File.Exists(path))
                {
                    modified = File.GetLastWriteTimeUtc(path);
                }
            }
            catch
            {
                // 文件可能在枚举后被删除；列表仍可显示名称。
            }

            return new ConfigItem(name, path, isDefault, modified);
        }

        private string? GetWritableRoot()
        {
            if (!string.IsNullOrWhiteSpace(FilePath))
            {
                var root = Path.GetDirectoryName(FilePath);
                if (!string.IsNullOrWhiteSpace(root))
                {
                    return root;
                }
            }

            foreach (var directory in CandidateDirectories)
            {
                try
                {
                    if (Directory.Exists(directory) || Directory.CreateDirectory(directory) is not null)
                    {
                        return directory;
                    }
                }
                catch
                {
                    // 继续尝试下一个候选目录。
                }
            }

            return null;
        }

        private string? FindConfigPath(string name)
        {
            var normalizedName = NormalizeConfigName(name);
            if (normalizedName is null)
            {
                return null;
            }

            if (normalizedName.Equals(DefaultConfigName, StringComparison.OrdinalIgnoreCase))
            {
                return FilePath;
            }

            return ListConfigs()
                .FirstOrDefault(item => !item.IsDefault && item.Name.Equals(normalizedName, StringComparison.OrdinalIgnoreCase))
                ?.FilePath;
        }

        private bool IsDefaultPath(string path)
        {
            return !string.IsNullOrWhiteSpace(FilePath) &&
                   string.Equals(Path.GetFullPath(path), Path.GetFullPath(FilePath), StringComparison.OrdinalIgnoreCase);
        }

        private static string? NormalizeConfigName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return null;
            }

            var normalized = name.Trim();
            if (normalized.Length > MaxConfigNameLength ||
                normalized.Any(character => char.IsControl(character) || InvalidNameChars.Contains(character)) ||
                normalized.Equals(".", StringComparison.Ordinal) ||
                normalized.Equals("..", StringComparison.Ordinal))
            {
                return null;
            }

            return normalized;
        }

        private static string GetSafeFileName(string name)
        {
            var safe = new string(name.Select(character => InvalidNameChars.Contains(character) ? '_' : character).ToArray()).Trim();
            return string.IsNullOrWhiteSpace(safe) ? "config" : safe;
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
