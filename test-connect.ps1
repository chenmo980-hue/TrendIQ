[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$apiKey = "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"
$url = "https://integrate.api.nvidia.com/v1/chat/completions"

$body = @{
  model      = "deepseek-ai/deepseek-v4-pro-0813"
  messages   = @(@{ role = "user"; content = "Say hello in one word." })
  max_tokens = 10
  stream     = $false
} | ConvertTo-Json -Depth 3

$headers = @{ "Authorization" = "Bearer $apiKey"; "Content-Type" = "application/json" }

try {
  $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $body -TimeoutSec 30
  Write-Host "SUCCESS!" -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    Write-Host "Response body: $($reader.ReadToEnd())" -ForegroundColor Yellow
  }
}
