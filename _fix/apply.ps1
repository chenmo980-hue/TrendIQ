$ErrorActionPreference = 'Stop'
$LF   = [string][char]10
$CRLF = [string][char]13 + [string][char]10

$root = 'E:/WorkSpaces/TrendIQ'
$fix  = "$root/_fix"
$orig = "$fix/orig"
$third= "$fix/third"
New-Item -ItemType Directory -Force -Path $orig, $third | Out-Null

$vmRel = 'api-tester-wpf/ViewModels/MainViewModel.cs'
$csRel = 'api-tester-wpf/Views/MainWindow.xaml.cs'
$vmSrc = "$root/$vmRel"
$csSrc = "$root/$csRel"

# 基线副本只在缺失时建立，避免覆盖真正的原件备份
if (-not (Test-Path "$orig/MainViewModel.cs"))  { Copy-Item -LiteralPath $vmSrc -Destination "$orig/MainViewModel.cs" -Force }
if (-not (Test-Path "$orig/MainWindow.xaml.cs")) { Copy-Item -LiteralPath $csSrc -Destination "$orig/MainWindow.xaml.cs" -Force }

$baseVm = (Get-FileHash -Algorithm SHA256 -LiteralPath "$orig/MainViewModel.cs").Hash
$baseCs = (Get-FileHash -Algorithm SHA256 -LiteralPath "$orig/MainWindow.xaml.cs").Hash
Write-Output "BASELINE MainViewModel.cs  $baseVm"
Write-Output "BASELINE MainWindow.xaml.cs $baseCs"

function LoadDoc([string]$p) {
  $t = Get-Content -Raw -LiteralPath $p
  $crlf = $t.Contains($CRLF)
  if ($crlf) { $t = $t.Replace($CRLF, $LF) }
  return @{ Text = $t; Crlf = $crlf }
}
function SaveDoc([string]$p, $doc) {
  $t = $doc.Text
  if ($doc.Crlf) { $t = $t.Replace($LF, $CRLF) }
  Set-Content -LiteralPath $p -Value $t -NoNewline -Encoding utf8
}

# ---------------- 补丁定义 ----------------
$a1o = @'
Timeout = TimeSpan.FromSeconds(90)
'@
$a1n = @'
Timeout = TimeSpan.FromSeconds(30)
'@

$a2o = @'
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"HTTP {(int)response.StatusCode} {response.ReasonPhrase}", null, response.StatusCode);
            }
'@
$a2n = @'
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
'@

$a3o = @'
        private static string RenderError(Exception exception)
        {
            var message = exception.Message;
            if (exception is HttpRequestException http && http.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                message = "HTTP 403 · 服务商拒绝了本次请求。若响应中包含 Cloudflare 1010，请检查客户端指纹或服务商入口。";
            }
            return "诊断：请求未完成\n" + message + "\n\n请检查 API 基本网址、密钥、模型 ID 与网络连接。";
        }
'@
$a3n = @'
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
'@

$a4o = @'
        private string _maxTokensText = "512";
'@
$a4n = @'
        private string _maxTokensText = "512";
        private string _savedModel = string.Empty;
'@

$a5o = @'
                if (!string.IsNullOrWhiteSpace(settings.SelectedModel))
                {
                    SelectedModel = settings.SelectedModel!;
                }
'@
$a5n = @'
                if (!string.IsNullOrWhiteSpace(settings.SelectedModel))
                {
                    // 此刻 Models 还是空的，ComboBox 会把 SelectedItem 置空并回写 "",
                    // 所以真正的选中要等模型列表拉回来之后再补。
                    _savedModel = settings.SelectedModel!;
                    SelectedModel = settings.SelectedModel!;
                }
'@

$a6o = @'
                SelectedModel = Models.FirstOrDefault() ?? string.Empty;
'@
$a6n = @'
                SelectedModel = Models.FirstOrDefault() ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(_savedModel) && Models.Contains(_savedModel))
                {
                    SelectedModel = _savedModel;
                }
'@

$a7o = @'
                SelectedModel = SelectedModel,
'@
$a7n = @'
                SelectedModel = string.IsNullOrWhiteSpace(SelectedModel) ? _savedModel : SelectedModel,
'@

$b1o = @'
            InitializeComponent();
            DataContextChanged += OnDataContextChanged;
            Closing += OnWindowClosing;
        }
'@
$b1n = @'
            InitializeComponent();
            DataContextChanged += OnDataContextChanged;
            Closing += OnWindowClosing;

            // XAML 里的 <DMSkinWindow.DataContext> 在 InitializeComponent() 期间就已经赋值，
            // 那一刻本类尚未订阅 DataContextChanged，所以首屏不会触发同步——
            // 表现为：密钥明明存在磁盘上，输入框却是空的。
            Loaded += (sender, args) =>
            {
                if (DataContext is MainViewModel viewModel)
                {
                    SyncApiKeyBoxes(viewModel);
                }
            };
        }
'@

# ---------------- 干跑：逐个核对锚点 ----------------
$docVm = LoadDoc $vmSrc
$docCs = LoadDoc $csSrc
$plan = @(
  @{ L='A1-timeout';   T=$docVm.Text; O=$a1o },
  @{ L='A2-body';      T=$docVm.Text; O=$a2o },
  @{ L='A3-render';    T=$docVm.Text; O=$a3o },
  @{ L='A4-field';     T=$docVm.Text; O=$a4o },
  @{ L='A5-load';      T=$docVm.Text; O=$a5o },
  @{ L='A6-restore';   T=$docVm.Text; O=$a6o },
  @{ L='A7-persist';   T=$docVm.Text; O=$a7o },
  @{ L='B1-loaded';    T=$docCs.Text; O=$b1o }
)
$missing = @()
Write-Output ''
Write-Output '--- DRY RUN ---'
foreach ($p in $plan) {
  $ok = $p.T.Contains($p.O)
  Write-Output ("{0,-14} anchor={1}" -f $p.L, $ok)
  if (-not $ok) { $missing += $p.L }
}
if ($missing.Count -gt 0) {
  Write-Output ''
  Write-Output ('MISSING ANCHORS: ' + ($missing -join ', '))
  Write-Output 'ABORTED BEFORE WRITING ANY FILE'
  exit 2
}
Write-Output 'ALL ANCHORS OK'
$docVm = $null
$docCs = $null

# ---------------- 正式应用 ----------------
$docVm = LoadDoc $vmSrc
$docVm.Text = $docVm.Text.Replace($a1o, $a1n)
$docVm.Text = $docVm.Text.Replace($a2o, $a2n)
$docVm.Text = $docVm.Text.Replace($a3o, $a3n)
$docVm.Text = $docVm.Text.Replace($a4o, $a4n)
$docVm.Text = $docVm.Text.Replace($a5o, $a5n)
$docVm.Text = $docVm.Text.Replace($a6o, $a6n)
$docVm.Text = $docVm.Text.Replace($a7o, $a7n)
SaveDoc $vmSrc $docVm

$docCs = LoadDoc $csSrc
$docCs.Text = $docCs.Text.Replace($b1o, $b1n)
SaveDoc $csSrc $docCs

$modVm = (Get-FileHash -Algorithm SHA256 -LiteralPath $vmSrc).Hash
$modCs = (Get-FileHash -Algorithm SHA256 -LiteralPath $csSrc).Hash
Write-Output ''
Write-Output "MODIFIED MainViewModel.cs  $modVm"
Write-Output "MODIFIED MainWindow.xaml.cs $modCs"
Write-Output "CHANGED  MainViewModel.cs  $($modVm -ne $baseVm)"
Write-Output "CHANGED  MainWindow.xaml.cs $($modCs -ne $baseCs)"

# ---------------- ROLLBACK 脚本 ----------------
$rb = @'
param([string]$TargetRoot = 'E:/WorkSpaces/TrendIQ')
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$orig = Join-Path $here 'orig'
Copy-Item -LiteralPath (Join-Path $orig 'MainViewModel.cs')  -Destination (Join-Path $TargetRoot 'api-tester-wpf/ViewModels/MainViewModel.cs')  -Force
Copy-Item -LiteralPath (Join-Path $orig 'MainWindow.xaml.cs') -Destination (Join-Path $TargetRoot 'api-tester-wpf/Views/MainWindow.xaml.cs') -Force
Write-Output 'ROLLBACK done'
'@
Set-Content -LiteralPath "$fix/ROLLBACK.ps1" -Value $rb -Encoding utf8

# ---------------- 在第三副本上真实执行 ROLLBACK ----------------
Remove-Item -Recurse -Force $third -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$third/api-tester-wpf/ViewModels", "$third/api-tester-wpf/Views" | Out-Null
Copy-Item -LiteralPath $vmSrc -Destination "$third/$vmRel" -Force
Copy-Item -LiteralPath $csSrc -Destination "$third/$csRel" -Force
& "$fix/ROLLBACK.ps1" -TargetRoot "$third" | Write-Output
$rbVm = (Get-FileHash -Algorithm SHA256 -LiteralPath "$third/$vmRel").Hash
$rbCs = (Get-FileHash -Algorithm SHA256 -LiteralPath "$third/$csRel").Hash
Write-Output "ROLLBACK MainViewModel.cs  $rbVm  matchesBaseline=$($rbVm -eq $baseVm)"
Write-Output "ROLLBACK MainWindow.xaml.cs $rbCs  matchesBaseline=$($rbCs -eq $baseCs)"
