param(
  [string[]]$Models,
  [string]$ApiKey,
  [string]$BaseUrl = "https://integrate.api.nvidia.com/v1",
  [int]$Rounds = 3,
  [int]$DelaySeconds = 5
)

Write-Host "DEBUG: Models received: $($Models -join ', ')" -ForegroundColor Magenta
Write-Host "DEBUG: Models count: $($Models.Count)" -ForegroundColor Magenta

$Prompt = "Explain the concept of quantum entanglement in 3 sentences. Be concise."
$Results = @()

foreach ($model in $Models) {
  Write-Host "`n=== Testing: $model ===" -ForegroundColor Cyan

  for ($r = 1; $r -le $Rounds; $r++) {
    Write-Host "  Round $r/$Rounds..." -ForegroundColor Gray

    $body = @{
      model      = $model
      messages   = @(@{ role = "user"; content = $Prompt })
      max_tokens = 200
      stream     = $true
    } | ConvertTo-Json -Depth 3

    $url = "$BaseUrl/chat/completions"
    $headers = @{ "Authorization" = "Bearer $ApiKey"; "Content-Type" = "application/json" }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $ttft = 0
    $totalTokens = 0
    $fullText = ""
    $lastError = $null

    try {
      $resp = Invoke-WebRequest -Uri $url -Headers $headers -Method Post -Body $body -UseBasicParsing -TimeoutSec 60
      $reader = [System.IO.StreamReader]::new($resp.RawResponse.ContentStream)
      $firstToken = $true

      while ($null -ne ($line = $reader.ReadLine())) {
        if ($line -match '^data: (.+)$') {
          $data = $Matches[1]
          if ($data -eq "[DONE]") { break }
          try {
            $chunk = $data | ConvertFrom-Json
            if ($chunk.choices[0].delta.content) {
              if ($firstToken) { $ttft = $sw.ElapsedMilliseconds; $firstToken = $false }
              $fullText += $chunk.choices[0].delta.content
              $totalTokens++
            }
          } catch {}
        }
      }
      $reader.Close()
    } catch {
      $lastError = $_.Exception.Message
    }

    $sw.Stop()
    $totalMs = $sw.ElapsedMilliseconds

    $Results += [PSCustomObject]@{
      Model    = $model
      Round    = $r
      TTFT_ms  = $ttft
      Total_ms = $totalMs
      Tokens   = $totalTokens
      TPS      = if ($totalMs -gt 100) { [math]::Round($totalTokens / ($totalMs / 1000), 1) } else { 0 }
      ErrMsg   = $lastError
    }

    if ($lastError) {
      Write-Host "    ERROR: $lastError" -ForegroundColor Red
    } else {
      $tpsVal = if ($totalMs -gt 100) { [math]::Round($totalTokens / ($totalMs / 1000), 1) } else { 0 }
      Write-Host "    TTFT=${ttft}ms  Total=${totalMs}ms  Tokens=$totalTokens  TPS=$tpsVal" -ForegroundColor Green
    }

    if ($r -lt $Rounds) { Start-Sleep -Seconds $DelaySeconds }
  }

  if ($model -ne $Models[-1]) {
    Write-Host "  Waiting $($DelaySeconds * 2)s before next model..." -ForegroundColor DarkGray
    Start-Sleep -Seconds ($DelaySeconds * 2)
  }
}

Write-Host "`n`n========== SUMMARY ==========" -ForegroundColor Yellow
$Summary = $Results | Where-Object { $_.ErrMsg -eq $null -and $_.Tokens -gt 0 } | Group-Object Model | ForEach-Object {
  [PSCustomObject]@{
    Model        = $_.Name
    Avg_TTFT_ms  = [math]::Round(($_.Group | Measure-Object TTFT_ms -Average).Average)
    Avg_Total_ms = [math]::Round(($_.Group | Measure-Object Total_ms -Average).Average)
    Avg_TPS      = [math]::Round(($_.Group | Measure-Object TPS -Average), 1)
    Max_TPS      = ($_.Group | Measure-Object TPS -Maximum).Maximum
    Min_TTFT_ms  = ($_.Group | Measure-Object TTFT_ms -Minimum).Minimum
  }
} | Sort-Object Avg_TPS -Descending

$Summary | Format-Table -AutoSize

$jsonPath = "E:\WorkSpaces\TrendIQ\nvidia-bench-results-debug.json"
$Results | ConvertTo-Json -Depth 3 | Out-File $jsonPath -Encoding UTF8
Write-Host "Raw results saved to: $jsonPath" -ForegroundColor DarkCyan