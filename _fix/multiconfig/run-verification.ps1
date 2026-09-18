$ErrorActionPreference = 'Stop'
$root = 'E:\WorkSpaces\TrendIQ'
$tx = Join-Path $root '_fix\multiconfig'
function Invoke-Logged {
    param([string]$Name, [scriptblock]$Action)
    $log = Join-Path $tx "$Name.log"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        & $Action > $log 2>&1
        $code = $LASTEXITCODE
    } catch {
        $code = 1
        Add-Content -LiteralPath $log -Encoding UTF8 -Value ([Environment]::NewLine + "Exception: " + $_.Exception.Message)
    }
    $sw.Stop()
    Add-Content -LiteralPath $log -Encoding UTF8 -Value ([Environment]::NewLine + "[exit code: $code]" + [Environment]::NewLine + "[elapsed: $($sw.Elapsed)]")
    Write-Output "$Name exit=$code log=$log"
    if ($code -ne 0) { throw "命令失败：$Name" }
}
Invoke-Logged 'modified-build' -Action {
    Set-Location $root
    & dotnet build api-tester-wpf/ApiTester.Wpf.csproj -c Release --no-restore
}
Invoke-Logged 'modified-publish' -Action {
    Set-Location $root
    & dotnet publish api-tester-wpf/ApiTester.Wpf.csproj -c Release --self-contained false --no-restore -o api-tester-wpf/dist
}
Invoke-Logged 'probe' -Action {
    $csc = Join-Path $env:ProgramFiles 'dotnet\sdk\8.0.101\Roslyn\bincore\csc.dll'
    $ref = Join-Path $env:ProgramFiles 'dotnet\packs\Microsoft.NETCore.App.Ref\8.0.1\ref\net8.0'
    $refs = Get-ChildItem -LiteralPath $ref -Filter '*.dll' | ForEach-Object { '-r:"' + $_.FullName + '"' }
    $out = Join-Path $tx 'probe\ConfigProbe.exe'
    & dotnet $csc -nologo -langversion:latest -nullable:enable -target:exe -out:$out (Join-Path $tx 'probe\Program.cs') (Join-Path $root 'api-tester-wpf\Services\SettingsStore.cs') @refs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $probeRoot = Join-Path $env:TEMP ('trendiq-env-' + [guid]::NewGuid().ToString('N'))
    $env:APPDATA = $probeRoot
    $env:LOCALAPPDATA = Join-Path $probeRoot 'local'
    Set-Location (Join-Path $tx 'probe')
    & dotnet .\ConfigProbe.exe
}
Invoke-Logged 'rollback' -Action {
    $script = Join-Path $tx 'ROLLBACK.sh'
    $wrapper = Join-Path $tx 'ROLLBACK.test.ps1'
    Get-Content -LiteralPath $script -Raw | Set-Content -LiteralPath $wrapper -Encoding UTF8
    pwsh -NoProfile -File $wrapper -Target (Join-Path $tx 'third')
}
Write-Output '全部日志已生成'
