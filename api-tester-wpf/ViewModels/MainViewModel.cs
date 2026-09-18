using ApiTester.Wpf.Services;
using DMSkin.Core;
using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Input;
using System.Windows.Threading;

namespace ApiTester.Wpf.ViewModels
{
    /// <summary>模型列表项。Name 来自 /models，IsSelected 绑定到 SelectedModel 供标签高亮。</summary>
    public sealed class ModelItem : System.ComponentModel.INotifyPropertyChanged
    {
        public string Name { get; }
        private bool _isSelected;
        public bool IsSelected
        {
            get => _isSelected;
            set { if (_isSelected != value) { _isSelected = value; PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(nameof(IsSelected))); } }
        }
        public event System.ComponentModel.PropertyChangedEventHandler PropertyChanged;
        public ModelItem(string name) { Name = name; }
        public override string ToString() => Name;
    }

    public sealed class MainViewModel : ViewModelBase
    {
        // 默认走直连：环境里 https_proxy 配错时，CONNECT 隧道后的 schannel 握手会拿不到客户端凭据
        // （SEC_E_NO_CREDENTIALS 0x8009030E），把整套 HTTPS 请求都拖死。如果以后真的要代理，
        // 改成读配置 BaseUrl 同目录下的 proxy.txt，不要走系统代理继承。
        private readonly HttpClient _httpClient = new HttpClient(new SocketsHttpHandler
        {
            UseProxy = false,
            UseCookies = false,
            AllowAutoRedirect = true,
        })
        {
            Timeout = TimeSpan.FromSeconds(30)
        };
        private readonly SettingsStore _settingsStore = new();
        private DispatcherTimer? _saveTimer;
        private bool _isLoadingSettings;
        private string _baseUrl = "https://kktoken.cc/v1";
        private string _apiKey = string.Empty;
        private bool _isBusy;
        private string _statusText = "就绪";
        private string _outputText = string.Empty;
        private string _selectedModel = string.Empty;
        private string _message = "你好";
        private string _maxTokensText = "512";
        private string _savedModel = string.Empty;
        private string _configName = string.Empty;
        private string _selectedConfigName = SettingsStore.DefaultConfigName;

        public MainViewModel()
        {
            FetchModelsCommand = new DelegateCommand(async _ => await FetchModelsAsync());
            SendMessageCommand = new DelegateCommand(async _ => await SendMessageAsync());
            ClearOutputCommand = new DelegateCommand(_ => ClearOutput());
            SaveSettingsCommand = new DelegateCommand(_ => PersistSettings(true));
            NewConfigCommand = new DelegateCommand(_ => CreateConfig());
            LoadConfigCommand = new DelegateCommand(_ => LoadConfig());
            RefreshConfigList();
            LoadSettings();
            // 启动即拉一次模型列表：用户一进界面下拉就有可用集合，
            // 不会因“没拉过模型就用了一个保存下来的坏模型”而一直提示错误。
            // 等价于手动点“拉取模型”按钮，但省去用户去找按钮这一步。
            System.Windows.Threading.Dispatcher.CurrentDispatcher.BeginInvoke(
                new Action(async () => await AutoFetchModelsOnStartupAsync()),
                System.Windows.Threading.DispatcherPriority.ApplicationIdle);
        }

        private async Task AutoFetchModelsOnStartupAsync()
        {
            if (string.IsNullOrWhiteSpace(ApiKey)) { return; }
            await FetchModelsAsync();
        }

        public string BaseUrl
        {
            get => _baseUrl;
            set
            {
                if (SetProperty(ref _baseUrl, value?.Trim() ?? string.Empty))
                {
                    ScheduleSave();
                }
            }
        }

        public string ApiKey
        {
            get => _apiKey;
            set
            {
                if (SetProperty(ref _apiKey, value ?? string.Empty))
                {
                    ScheduleSave();
                }
            }
        }

        public bool IsBusy
        {
            get => _isBusy;
            set => SetProperty(ref _isBusy, value);
        }

        public string StatusText
        {
            get => _statusText;
            set => SetProperty(ref _statusText, value);
        }

        public string OutputText
        {
            get => _outputText;
            set => SetProperty(ref _outputText, value);
        }

        public ObservableCollection<ModelItem> Models { get; } = new();

        public string SelectedModel
        {
            get => _selectedModel;
            set
            {
                if (SetProperty(ref _selectedModel, value ?? string.Empty))
                {
                    ScheduleSave();
                }
            }
        }

        public string Message
        {
            get => _message;
            set
            {
                if (SetProperty(ref _message, value ?? string.Empty))
                {
                    ScheduleSave();
                }
            }
        }

        public string MaxTokensText
        {
            get => _maxTokensText;
            set
            {
                if (SetProperty(ref _maxTokensText, value ?? "512"))
                {
                    ScheduleSave();
                }
            }
        }

        /// <summary>新配置的输入名称；不会随配置内容自动保存。</summary>
        public string ConfigName
        {
            get => _configName;
            set => SetProperty(ref _configName, value ?? string.Empty);
        }

        /// <summary>配置下拉框当前选中的名称。</summary>
        public string SelectedConfigName
        {
            get => _selectedConfigName;
            set
            {
                SetProperty(ref _selectedConfigName, string.IsNullOrWhiteSpace(value) ? SettingsStore.DefaultConfigName : value);
            }
        }

        public ObservableCollection<ConfigItem> SavedConfigs { get; } = new();

        public ICommand FetchModelsCommand { get; }
        public ICommand SendMessageCommand { get; }
        public ICommand ClearOutputCommand { get; }
        public ICommand SaveSettingsCommand { get; }
        public ICommand NewConfigCommand { get; }
        public ICommand LoadConfigCommand { get; }

        /// <summary>从 WrapPanel 标签点击时调用：先选中，立即探活，失败回滚并提示。</summary>
        public async void SelectModelFromTag(string model)
        {
            if (string.IsNullOrWhiteSpace(model) || model == _selectedModel) { return; }
            var previous = _selectedModel;
            SelectedModel = model;
            SyncModelItemsSelection();
            StatusText = "正在验证 " + model + " ...";
            var ok = await ProbeModelAsync(model);
            if (ok)
            {
                StatusText = "已选 " + model + "，探活通过";
            }
            else
            {
                // 联动校验：标签点击切了 SelectedModel，探活失败说明该模型实际不可用，
                // 回滚避免用户进死路。状态栏给出明确原因。
                SelectedModel = previous;
                SyncModelItemsSelection();
                StatusText = model + " 在该中继上不可用，已回退到 " + previous;
            }
        }

        /// <summary>把 Models 里名称等于 _selectedModel 的项打上 IsSelected 标记，UI 标签高亮就靠它。</summary>
        private void SyncModelItemsSelection()
        {
            foreach (var m in Models) { m.IsSelected = m.Name == _selectedModel; }
        }

        private string Url(string path)
        {
            var baseUri = BaseUrl.Trim().TrimEnd('/');
            return baseUri + "/" + path.TrimStart('/');
        }

        private HttpRequestMessage CreateRequest(HttpMethod method, string path, HttpContent? content = null)
        {
            var request = new HttpRequestMessage(method, Url(path)) { Content = content };
            request.Headers.Add("Authorization", "Bearer " + ApiKey.Trim());
            request.Headers.Add("Accept", "application/json");
            return request;
        }

        private async Task<string> SendAsync(HttpRequestMessage request)
        {
            using var response = await _httpClient.SendAsync(request);
            var raw = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                // 把服务端正文里的 error.message 一并带出来，否则界面只剩一个光秃秃的状态码，
                // 400 与“通道挂了”看起来毫无区别。
                var detail = raw;
                try
                {
                    using var document = JsonDocument.Parse(raw);
                    if (document.RootElement.TryGetProperty("error", out var error) &&
                        error.TryGetProperty("message", out var errorMessage))
                    {
                        detail = errorMessage.GetString() ?? raw;
                    }
                }
                catch
                {
                    // 非 JSON 响应，保留原文。
                }

                throw new HttpRequestException(
                    $"HTTP {(int)response.StatusCode} {response.ReasonPhrase} · {detail}",
                    null,
                    response.StatusCode);
            }
            return raw;
        }

        private static readonly JsonSerializerOptions PrettyJsonOptions = new()
        {
            WriteIndented = true,
            // 默认 Encoder 会把所有非 ASCII 字符转义成 \uXXXX，输出框里看到的就不是
            // 中文而是 “\u4F60\u597D”。UnsafeRelaxedJsonEscaping 让中文原样输出。
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        private static string PrettyJson(string json)
        {
            try
            {
                using var document = JsonDocument.Parse(json);
                return JsonSerializer.Serialize(document.RootElement, PrettyJsonOptions);
            }
            catch
            {
                return json;
            }
        }

        /// <summary>从 /chat/completions 响应里抽出 content 与 reasoning_content 作为正文输出。
        /// 用 JsonElement.GetString() 反转义，emoji / surrogate pair 都会还原成可显示字符，
        /// 而不是再看 \uD83D\uDC4B 这种转义片段。完整原始 JSON 折叠在末尾以备排错。</summary>
        private static string FormatAssistantReply(string json)
        {
            try
            {
                using var document = JsonDocument.Parse(json);
                var root = document.RootElement;
                var sb = new StringBuilder();

                if (root.TryGetProperty("choices", out var choices) &&
                    choices.ValueKind == JsonValueKind.Array &&
                    choices.GetArrayLength() > 0)
                {
                    var first = choices[0];
                    if (first.TryGetProperty("message", out var msg) && msg.ValueKind == JsonValueKind.Object)
                    {
                        if (msg.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.String)
                        {
                            sb.AppendLine(content.GetString());
                        }
                        if (msg.TryGetProperty("reasoning_content", out var reasoning) && reasoning.ValueKind == JsonValueKind.String)
                        {
                            var r = reasoning.GetString();
                            if (!string.IsNullOrWhiteSpace(r))
                            {
                                sb.AppendLine();
                                sb.AppendLine("【思考过程】");
                                sb.AppendLine(r);
                            }
                        }
                    }
                }

                if (root.TryGetProperty("usage", out var usage) && usage.ValueKind == JsonValueKind.Object)
                {
                    sb.AppendLine();
                    sb.Append("【用量】 prompt=");
                    if (usage.TryGetProperty("prompt_tokens", out var pt)) sb.Append(pt.GetRawText());
                    sb.Append(" completion=");
                    if (usage.TryGetProperty("completion_tokens", out var ct)) sb.Append(ct.GetRawText());
                    sb.Append(" total=");
                    if (usage.TryGetProperty("total_tokens", out var tt)) sb.Append(tt.GetRawText());
                    sb.AppendLine();
                }

                if (root.TryGetProperty("model", out var usedModel) && usedModel.ValueKind == JsonValueKind.String)
                {
                    sb.Append("【模型】 ").AppendLine(usedModel.GetString());
                }

                sb.AppendLine();
                sb.AppendLine("【原始响应】");
                sb.AppendLine(PrettyJson(json));
                return sb.ToString();
            }
            catch
            {
                return PrettyJson(json);
            }
        }

        private async Task FetchModelsAsync()
        {
            if (IsBusy || string.IsNullOrWhiteSpace(ApiKey))
            {
                StatusText = string.IsNullOrWhiteSpace(ApiKey) ? "请先填写 API 密钥" : "请求中...";
                return;
            }

            IsBusy = true;
            StatusText = "正在拉取模型...";
            OutputText = string.Empty;
            try
            {
                var stopwatch = Stopwatch.StartNew();
                using var request = CreateRequest(HttpMethod.Get, "/models");
                var json = await SendAsync(request);
                stopwatch.Stop();
                using var document = JsonDocument.Parse(json);
                Models.Clear();
                if (document.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in data.EnumerateArray())
                    {
                        if (item.TryGetProperty("id", out var id) && !string.IsNullOrWhiteSpace(id.GetString()))
                        {
                            Models.Add(new ModelItem(id.GetString()!));
                        }
                    }
                }
                SelectedModel = Models.FirstOrDefault()?.Name ?? string.Empty;
                SyncModelItemsSelection();
                if (!string.IsNullOrWhiteSpace(_savedModel) && Models.Any(m => m.Name == _savedModel))
                {
                    // /models 目录里列出 DeepSeek-V4-Pro 不代表 /chat 也接它——目录与实际可用性经常不一致。
                    // 立刻对保存的模型发一次极小探针，能用就保留；不能就清掉 _savedModel 并回退到列表第一个，
                    // 否则用户进界面就拿到"400 not supported"，看起来"一直提示错误"。
                    if (await ProbeModelAsync(_savedModel))
                    {
                        SelectedModel = _savedModel;
                        SyncModelItemsSelection();
                    }
                    else
                    {
                        StatusText = "已保存的 " + _savedModel + " 在该中继上实际不可用，已自动切换到 " + SelectedModel;
                        _savedModel = string.Empty;
                    }
                }
                StatusText = Models.Count > 0
                    ? $"已加载 {Models.Count} 个模型 · {stopwatch.Elapsed.TotalSeconds:0.00}s"
                    : $"接口返回 0 个模型 · {stopwatch.Elapsed.TotalSeconds:0.00}s";
                OutputText = PrettyJson(json);
            }
            catch (Exception ex)
            {
                WriteDiag("FetchModels failed", ex);
                var inner = ex.InnerException;
                var detail = inner is null ? ex.Message : (inner.GetType().Name + " :: " + inner.Message);
                StatusText = "拉取失败：" + detail;
                OutputText = RenderError(ex);
            }
            finally
            {
                IsBusy = false;
            }
        }

        private async Task SendMessageAsync()
        {
            if (IsBusy) return;
            if (string.IsNullOrWhiteSpace(ApiKey))
            {
                StatusText = "请先填写 API 密钥";
                return;
            }
            if (string.IsNullOrWhiteSpace(SelectedModel))
            {
                StatusText = "请选择或输入模型";
                return;
            }
            if (!int.TryParse(MaxTokensText, out var maxTokens) || maxTokens < 1)
            {
                StatusText = "最大输出 token 必须是正整数";
                return;
            }
            if (string.IsNullOrWhiteSpace(Message))
            {
                StatusText = "请输入消息内容";
                return;
            }

            IsBusy = true;
            StatusText = "正在发送...";
            try
            {
                var stopwatch = Stopwatch.StartNew();
                var payload = new
                {
                    model = SelectedModel,
                    messages = new[] { new { role = "user", content = Message } },
                    max_tokens = maxTokens
                };
                using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var request = CreateRequest(HttpMethod.Post, "/chat/completions", content);
                var json = await SendAsync(request);
                stopwatch.Stop();
                StatusText = $"请求完成 · {stopwatch.Elapsed.TotalSeconds:0.00}s";
                OutputText = FormatAssistantReply(json);
            }
            catch (Exception ex)
            {
                WriteDiag("SendMessage failed", ex);
                var inner = ex.InnerException;
                var detail = inner is null ? ex.Message : (inner.GetType().Name + " :: " + inner.Message);
                StatusText = "发送失败：" + detail;
                OutputText = RenderError(ex);
            }
            finally
            {
                IsBusy = false;
            }
        }

        private static readonly string DiagPath = System.IO.Path.Combine(AppContext.BaseDirectory, "diag.txt");

        /// <summary>把异常完整堆栈和 inner exception 追加到 diag.txt，给排查“一直报错”用。</summary>
        private static void WriteDiag(string tag, Exception ex)
        {
            try
            {
                var sb = new StringBuilder();
                sb.Append('[').Append(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff")).Append("] ").AppendLine(tag);
                sb.AppendLine("  type:   " + ex.GetType().FullName);
                sb.AppendLine("  message: " + ex.Message);
                for (var inner = ex.InnerException; inner != null; inner = inner.InnerException)
                {
                    sb.AppendLine("  inner:   " + inner.GetType().FullName + " :: " + inner.Message);
                }
                sb.AppendLine("  stack:  " + ex.StackTrace);
                sb.AppendLine("  env HTTP_PROXY=" + (Environment.GetEnvironmentVariable("HTTP_PROXY") ?? "<null>")
                    + " HTTPS_PROXY=" + (Environment.GetEnvironmentVariable("HTTPS_PROXY") ?? "<null>")
                    + " NO_PROXY=" + (Environment.GetEnvironmentVariable("NO_PROXY") ?? "<null>"));
                System.IO.File.AppendAllText(DiagPath, sb.ToString());
            }
            catch
            {
                // 诊断写不进去也不能再抛。
            }
        }

        /// <summary>对单个模型发一个极小探针，确认它在 /chat 端真的可用。失败立即返回，不抛。</summary>
        private async Task<bool> ProbeModelAsync(string model)
        {
            if (string.IsNullOrWhiteSpace(model)) { return false; }
            try
            {
                var payload = new
                {
                    model = model,
                    messages = new[] { new { role = "user", content = "ping" } },
                    max_tokens = 1
                };
                using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var request = CreateRequest(HttpMethod.Post, "/chat/completions", content);
                var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(3));
                using var response = await _httpClient.SendAsync(request, cts.Token);
                if (!response.IsSuccessStatusCode)
                {
                    WriteDiag("ProbeModel " + model + " 失败", new HttpRequestException("HTTP " + (int)response.StatusCode));
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                WriteDiag("ProbeModel " + model + " 异常", ex);
                return false;
            }
        }

        private static string RenderError(Exception exception)
        {
            if (exception is OperationCanceledException || exception is TimeoutException)
            {
                return "诊断：请求未完成\n" + exception.Message +
                    "\n\n请求超过了客户端超时上限。这条中继上有些模型名在目录里、但当前分组下没有可用通道，" +
                    "请求会一直挂在队列里直到超时。换一个模型重试。";
            }

            if (exception is HttpRequestException http)
            {
                var reason = http.StatusCode switch
                {
                    System.Net.HttpStatusCode.BadRequest =>
                        "400：中继拒绝了这次请求。正文通常写明 Requested model ... not supported，即该模型不受支持。",
                    System.Net.HttpStatusCode.Unauthorized =>
                        "401：密钥无效或已被撤销。",
                    System.Net.HttpStatusCode.Forbidden =>
                        "403：账号没有该模型的权限，或额度/订单已失效；若响应含 Cloudflare 1010，则为客户端指纹被拒。",
                    System.Net.HttpStatusCode.NotFound =>
                        "404：中继上没有这个模型的可用通道。",
                    System.Net.HttpStatusCode.ServiceUnavailable =>
                        "503：当前分组下没有可用渠道，换模型或稍后重试。",
                    (System.Net.HttpStatusCode)522 =>
                        "522：上游连接超时，该模型的通道已经挂掉。",
                    _ =>
                        "请检查 API 基本网址、密钥、模型 ID 与网络连接。"
                };
                return "诊断：请求未完成\n" + http.Message + "\n\n" + reason;
            }

            return "诊断：请求未完成\n" + exception.Message + "\n\n请检查 API 基本网址、密钥、模型 ID 与网络连接。";
        }

        /// <summary>清空输出区与状态栏。不依赖任何 IsBusy 状态——任何时候都能调。</summary>
        public void ClearOutput()
        {
            OutputText = string.Empty;
            StatusText = "已清空";
        }

        private AppSettings CaptureSettings()
        {
            return new AppSettings
            {
                BaseUrl = BaseUrl,
                ApiKey = ApiKey,
                SelectedModel = string.IsNullOrWhiteSpace(SelectedModel) ? _savedModel : SelectedModel,
                MaxTokens = MaxTokensText,
                Message = Message
            };
        }

        /// <summary>用当前界面内容新建一个不重名的配置。</summary>
        public bool CreateConfig()
        {
            var name = ConfigName.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                StatusText = "请先输入新配置名称";
                return false;
            }

            if (_settingsStore.ConfigExists(name))
            {
                StatusText = "配置名已存在，请更换名称";
                return false;
            }

            if (!_settingsStore.CreateConfig(name, CaptureSettings()))
            {
                StatusText = "新建配置失败：当前目录不可写";
                return false;
            }

            SelectedConfigName = name;
            ConfigName = string.Empty;
            RefreshConfigList();
            StatusText = "已新建配置：" + name;
            return true;
        }

        /// <summary>读取下拉框选中的配置并切换到界面。</summary>
        public bool LoadConfig()
        {
            var name = SelectedConfigName.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                StatusText = "请先选择要读取的配置";
                return false;
            }

            var settings = _settingsStore.LoadConfig(name);
            if (settings is null)
            {
                StatusText = "读取配置失败：" + name;
                return false;
            }

            ApplySettings(settings, "已读取配置：" + name, preserveDefaults: false);
            SelectedConfigName = name;
            ConfigName = string.Empty;
            RefreshConfigList();
            return true;
        }

        private void ApplySettings(AppSettings settings, string status, bool preserveDefaults = true)
        {
            _isLoadingSettings = true;
            try
            {
                if (!string.IsNullOrWhiteSpace(settings.BaseUrl) || !preserveDefaults)
                {
                    BaseUrl = settings.BaseUrl ?? string.Empty;
                }

                if (settings.ApiKey is not null || !preserveDefaults)
                {
                    ApiKey = settings.ApiKey ?? string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(settings.SelectedModel) || !preserveDefaults)
                {
                    _savedModel = settings.SelectedModel ?? string.Empty;
                    SelectedModel = settings.SelectedModel ?? string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(settings.MaxTokens) || !preserveDefaults)
                {
                    MaxTokensText = settings.MaxTokens ?? "512";
                }

                if (settings.Message is not null || !preserveDefaults)
                {
                    Message = settings.Message ?? "你好";
                }
            }
            finally
            {
                _isLoadingSettings = false;
            }

            StatusText = status;
        }

        private void RefreshConfigList()
        {
            var previous = SelectedConfigName;
            SavedConfigs.Clear();
            foreach (var item in _settingsStore.ListConfigs())
            {
                SavedConfigs.Add(item);
            }

            if (SavedConfigs.Count == 0)
            {
                SelectedConfigName = SettingsStore.DefaultConfigName;
                return;
            }

            var active = _settingsStore.ActiveConfigName ?? previous;
            SelectedConfigName = SavedConfigs.Any(item => item.Name.Equals(active, StringComparison.OrdinalIgnoreCase))
                ? active!
                : (SavedConfigs.Any(item => item.Name.Equals(previous, StringComparison.OrdinalIgnoreCase)) ? previous : SavedConfigs[0].Name);
        }

        /// <summary>把当前配置写入本地文件；report 为真时把结果写进状态栏。</summary>
        public void PersistSettings(bool report)
        {
            _saveTimer?.Stop();
            var saved = _settingsStore.Save(CaptureSettings());

            if (report)
            {
                var configName = _settingsStore.ActiveConfigName ?? SettingsStore.DefaultConfigName;
                StatusText = saved
                    ? $"配置已保存：{configName}（{_settingsStore.ActiveFilePath ?? _settingsStore.FilePath ?? "内存"}）"
                    : "配置已保存到内存（当前目录不可写）";
            }
        }

        /// <summary>启动时把上次保存的配置读回界面。</summary>
        private void LoadSettings()
        {
            var settings = _settingsStore.Load();
            RefreshConfigList();
            if (settings is null)
            {
                StatusText = "未找到历史配置，当前为默认值";
                return;
            }

            ApplySettings(settings, string.IsNullOrWhiteSpace(_settingsStore.LoadedFromPath)
                ? "已载入上次配置"
                : "已载入上次配置：" + _settingsStore.LoadedFromPath);
            ConfigName = string.Empty;
        }

        /// <summary>输入停止约 0.8 秒后自动落盘，避免逐字写文件。</summary>
        private void ScheduleSave()
        {
            if (_isLoadingSettings)
            {
                return;
            }

            if (_saveTimer is null)
            {
                var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(800) };
                timer.Tick += (_, _) =>
                {
                    timer.Stop();
                    PersistSettings(false);
                };
                _saveTimer = timer;
            }

            _saveTimer.Stop();
            _saveTimer.Start();
        }

        private bool SetProperty<T>(ref T field, T value, [System.Runtime.CompilerServices.CallerMemberName] string? propertyName = null)
        {
            if (Equals(field, value)) return false;
            field = value;
            OnPropertyChanged(propertyName);
            return true;
        }
    }
}
