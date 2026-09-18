
$ErrorActionPreference='Continue'
Write-Output '===== 1) OpenCode 保存的凭据（auth.json） ====='
$auth = Join-Path $env:USERPROFILE '.local\share\opencode\auth.json'
if (Test-Path $auth) {
  $raw = Get-Content $auth -Raw
  $j = $raw | ConvertFrom-Json
  foreach ($p in $j.PSObject.Properties) {
    $val = $p.Value
    if ($val -is [string]) {
      Write-Output ($p.Name + ' = ' + $val.Substring(0,[Math]::Min(8,$val.Length)) + '*** (' + $val.Length + ' chars)')
    } else {
      $cv = ($val | ConvertTo-Json -Compress -Depth 3)
      Write-Output ($p.Name + ' = ' + $cv.Substring(0,[Math]::Min(200,$cv.Length)))
    }
  }
} else { Write-Output 'auth.json 不存在' }

Write-Output ''
Write-Output '===== 2) 8889 进程是什么 ====='
try {
  $cim = Get-CimInstance Win32_Process -Filter 'ProcessId=43524' -ErrorAction Stop
  Write-Output ('CMDLINE=' + $cim.CommandLine)
  Write-Output ('EXECUTABLE=' + $cim.ExecutablePath)
} catch { Write-Output ('CimInstance 失败: ' + $_.Exception.Message) }

Write-Output ''
Write-Output '===== 3) 用真实 key 打 8889 的 chat/completions（模拟 OpenCode 真实请求路径） ====='
$payload = '{"model":"Qwen3.8-27B","messages":[{"role":"user","content":"你好"}],"max_tokens":16}'
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8889/v1/chat/completions' -Method POST -TimeoutSec 60 -Headers @{ 'Authorization' = 'Bearer sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf'; 'Content-Type' = 'application/json' } -Body $payload -ErrorAction Stop
  Write-Output ('HTTP=' + $r.StatusCode + ' 长度=' + $r.Content.Length)
  $t = $r.Content
  if ($t.Length -gt 800) { Write-Output ($t.Substring(0,800) + ' ...[截断]') } else { Write-Output $t }
} catch {
  Write-Output ('请求失败: ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    Write-Output ('HTTP=' + [int]$_.Exception.Response.StatusCode)
    try {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      $b2 = $sr.ReadToEnd()
      Write-Output $b2.Substring(0, [Math]::Min(800, $b2.Length))
    } catch {}
  }
}

Write-Output ''
Write-Output '===== 4) 8889 的 models（带 key） ====='
try {
  $r2 = Invoke-WebRequest -Uri 'http://127.0.0.1:8889/v1/models' -Method GET -TimeoutSec 15 -Headers @{ 'Authorization' = 'Bearer sk-E6T88LykAvQ4ZeEioJ7RTg3LkIvmrB94fjELaK6dCX9m3nvf' } -ErrorAction Stop
  Write-Output ('HTTP=' + $r2.StatusCode + ' 长度=' + $r2.Content.Length)
  $t2 = $r2.Content
  if ($t2.Length -gt 600) { Write-Output ($t2.Substring(0,600) + ' ...[截断]') } else { Write-Output $t2 }
} catch {
  Write-Output ('请求失败: ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    Write-Output ('HTTP=' + [int]$_.Exception.Response.StatusCode)
    try {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      $b3 = $sr.ReadToEnd()
      Write-Output $b3.Substring(0, [Math]::Min(600, $b3.Length))
    } catch {}
  }
}
