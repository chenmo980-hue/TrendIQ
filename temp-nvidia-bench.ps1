$apiKey = "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"
$models = @(
  "deepseek-ai/deepseek-v4-pro-0813",
  "deepseek-ai/deepseek-v4-flash-0731",
  "mistralai/mistral-large-2-instruct"
)
& "C:\Users\Admin\.local\share\opencode\scripts\nvidia-bench51.ps1" -Models $models -ApiKey $apiKey -Rounds 3 -DelaySeconds 4