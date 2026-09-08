import subprocess
import json
import time

API_KEY = "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"

body = json.dumps({
    "model": "deepseek-ai/deepseek-v4-pro-0813",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10,
    "stream": False,
})

result = subprocess.run(
    [
        "curl", "-s", "--connect-timeout", "10", "--max-time", "30",
        "-X", "POST", "https://integrate.api.nvidia.com/v1/chat/completions",
        "-H", f"Authorization: Bearer {API_KEY}",
        "-H", "Content-Type: application/json",
        "-d", body,
    ],
    capture_output=True, text=True, timeout=45
)
print("STDOUT:", result.stdout[:500])
print("STDERR:", result.stderr[:500])
print("Return code:", result.returncode)
