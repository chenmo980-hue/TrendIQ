param([string]$TargetRoot = 'E:/WorkSpaces/TrendIQ')
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$orig = Join-Path $here 'orig'
Copy-Item -LiteralPath (Join-Path $orig 'MainViewModel.cs')  -Destination (Join-Path $TargetRoot 'api-tester-wpf/ViewModels/MainViewModel.cs')  -Force
Copy-Item -LiteralPath (Join-Path $orig 'MainWindow.xaml.cs') -Destination (Join-Path $TargetRoot 'api-tester-wpf/Views/MainWindow.xaml.cs') -Force
Write-Output 'ROLLBACK done'
