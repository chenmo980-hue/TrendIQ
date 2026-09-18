$ErrorActionPreference = 'Stop'
$cs = Join-Path $PSScriptRoot 'CredHelper.cs'
Add-Type -TypeDefinition (Get-Content -LiteralPath $cs -Raw) -Language CSharp
$raw = [CredHelper]::Get('git:https://github.com')
$parts = $raw -split '\|', 2
Write-Output ('user_len=' + $parts[0].Length)
Write-Output ('token_len=' + $parts[1].Length)
Write-Output ('token_head=' + $parts[1].Substring(0, [Math]::Min(8, $parts[1].Length)))
Write-Output ('token_tail=' + $parts[1].Substring([Math]::Max(0, $parts[1].Length - 4)))
