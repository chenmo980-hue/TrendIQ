param(
    [string]$Target = "E:/WorkSpaces/TrendIQ"
)

$ErrorActionPreference = "Stop"
$TxDir = "E:/WorkSpaces/TrendIQ/_fix/multiconfig"
$files = @(
    "Services/SettingsStore.cs",
    "ViewModels/MainViewModel.cs",
    "Views/MainWindow.xaml",
    "Views/MainWindow.xaml.cs",
    "README.md"
)

foreach ($rel in $files) {
    $destinationDirectory = Join-Path $Target "api-tester-wpf/$(Split-Path $rel -Parent)"
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
    Copy-Item -LiteralPath (Join-Path $TxDir "orig/api-tester-wpf/$rel") -Destination (Join-Path $Target "api-tester-wpf/$rel") -Force
}

Write-Output "回滚完成：$Target/api-tester-wpf"

