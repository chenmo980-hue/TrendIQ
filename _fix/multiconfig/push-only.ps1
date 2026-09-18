$ErrorActionPreference = 'Stop'
$cs = Join-Path $PSScriptRoot 'CredHelper.cs'
Add-Type -TypeDefinition (Get-Content -LiteralPath $cs -Raw) -Language CSharp
$raw = [CredHelper]::Get('git:https://github.com')
$parts = $raw -split '\|', 2
$pushUrl = 'https://' + $parts[0] + ':' + $parts[1] + '@github.com/chenmo980-hue/TrendIQ.git'
Set-Location (Join-Path $PSScriptRoot '..\..')
git -c credential.helper= -c http.sslBackend=openssl -c http.version=HTTP/1.1 push $pushUrl main
exit $LASTEXITCODE
