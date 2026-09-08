import json
import time
import requests
import os

# Force proxy usage
PROXY = os.environ.get("https_proxy", "http://127.0.0.1:7897")
proxies = {"http": PROXY, "https": PROXY}

API_KEY = "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"
BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
PROMPT = "Explain the concept of quantum entanglement in 3 sentences. Be concise."
MODELS = [
    "deepseek-ai/deepseek-v4-pro-0813",
    "deepseek-ai/deepseek-v4-flash-0731",
    "mistralai/mistral-large-2-instruct",
]
ROUNDS = 3
DELAY = 4

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# Quick connectivity test
print("Testing connectivity...")
try:
    test_resp = requests.post(
        BASE_URL,
        headers=HEADERS,
        json={"model": "deepseek-ai/deepseek-v4-pro-0813", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 5, "stream": False},
        proxies=proxies,
        timeout=(10, 30),
    )
    print(f"Connectivity test: HTTP {test_resp.status_code}")
    if test_resp.status_code != 200:
        print(f"Response: {test_resp.text[:200]}")
except Exception as e:
    print(f"Connectivity test FAILED: {e}")
    print("Trying without explicit proxy...")

def test_model(model, rnd):
    body = {
        "model": model,
        "messages": [{"role": "user", "content": PROMPT}],
        "max_tokens": 150,
        "stream": True,
    }

    ttft = 0
    total_tokens = 0
    full_text = ""
    error = None

    start = time.perf_counter()
    try:
        resp = requests.post(BASE_URL, headers=HEADERS, json=body, stream=True,
                             proxies=proxies, timeout=(15, 120))
        resp.raise_for_status()
        first_token = True
        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data = line[6:]
            if data == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                content = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                if content:
                    if first_token:
                        ttft = int((time.perf_counter() - start) * 1000)
                        first_token = False
                    full_text += content
                    total_tokens += 1
            except (json.JSONDecodeError, IndexError, KeyError):
                pass
        resp.close()
    except Exception as e:
        error = str(e)

    elapsed = int((time.perf_counter() - start) * 1000)
    tps = round(total_tokens / (elapsed / 1000), 1) if elapsed > 0 and total_tokens > 0 else 0

    return {
        "model": model,
        "round": rnd,
        "ttft_ms": ttft,
        "total_ms": elapsed,
        "tokens": total_tokens,
        "tps": tps,
        "error": error,
        "text": (full_text[:80] + "...") if len(full_text) > 80 else full_text,
    }

all_results = []

for model in MODELS:
    print(f"\n=== Testing: {model} ===")
    for r in range(1, ROUNDS + 1):
        print(f"  Round {r}/{ROUNDS}...", end=" ", flush=True)
        result = test_model(model, r)
        all_results.append(result)
        if result["error"]:
            print(f"ERROR: {result['error']}")
        else:
            print(f"TTFT={result['ttft_ms']}ms  Total={result['total_ms']}ms  Tokens={result['tokens']}  TPS={result['tps']}")
            print(f"    Text: {result['text'][:100]}")
        if r < ROUNDS:
            time.sleep(DELAY)
    if model != MODELS[-1]:
        print(f"  Waiting {DELAY * 2}s before next model...")
        time.sleep(DELAY * 2)

print("\n\n========== SUMMARY ==========")
successful = [r for r in all_results if r["error"] is None]
if successful:
    from collections import defaultdict
    grouped = defaultdict(list)
    for r in successful:
        grouped[r["model"]].append(r)

    summary = []
    for m, rs in grouped.items():
        avg_ttft = round(sum(r["ttft_ms"] for r in rs) / len(rs))
        avg_total = round(sum(r["total_ms"] for r in rs) / len(rs))
        avg_tps = round(sum(r["tps"] for r in rs) / len(rs), 1)
        max_tps = max(r["tps"] for r in rs)
        min_ttft = min(r["ttft_ms"] for r in rs)
        summary.append((m, avg_ttft, avg_total, avg_tps, max_tps, min_ttft))

    summary.sort(key=lambda x: x[3], reverse=True)

    header = f"{'Model':<45} {'AvgTTFT':>8} {'AvgTotal':>9} {'AvgTPS':>7} {'MaxTPS':>7} {'MinTTFT':>8}"
    print(header)
    print("-" * len(header))
    for m, att, atot, atp, mtp, mtt in summary:
        print(f"{m:<45} {att:>7}ms {atot:>8}ms {atp:>7} {mtp:>7} {mtt:>7}ms")
else:
    print("No successful results.")

print("\nFailed rounds:")
for r in all_results:
    if r["error"]:
        print(f"  {r['model']} (Round {r['round']}): {r['error']}")

with open("E:/WorkSpaces/TrendIQ/nvidia-bench-results.json", "w", encoding="utf-8") as f:
    json.dump(all_results, f, indent=2, ensure_ascii=False)
print("\nRaw results saved to: E:/WorkSpaces/TrendIQ/nvidia-bench-results.json")
