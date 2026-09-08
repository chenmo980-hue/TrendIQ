import json
import queue
import threading
import time
import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class ApiTester(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("OpenAI API Tester")
        self.geometry("1120x760")
        self.minsize(900, 620)
        self.result_queue = queue.Queue()
        self.models = []
        self.busy = False
        self._build_style()
        self._build_ui()
        self.after(100, self._drain_results)

    def _build_style(self):
        style = ttk.Style(self)
        try:
            style.theme_use("vista")
        except tk.TclError:
            pass
        style.configure("Title.TLabel", font=("Segoe UI", 18, "bold"))
        style.configure("Muted.TLabel", foreground="#667085")
        style.configure("Accent.TButton", padding=(14, 7))

    def _build_ui(self):
        root = ttk.Frame(self, padding=18)
        root.pack(fill="both", expand=True)
        root.columnconfigure(0, weight=1)
        root.rowconfigure(2, weight=1)

        header = ttk.Frame(root)
        header.grid(row=0, column=0, sticky="ew", pady=(0, 14))
        header.columnconfigure(1, weight=1)
        ttk.Label(header, text="API 测试工作台", style="Title.TLabel").grid(row=0, column=0, sticky="w")
        self.status_var = tk.StringVar(value="就绪")
        ttk.Label(header, textvariable=self.status_var, style="Muted.TLabel").grid(row=0, column=1, sticky="e")

        settings = ttk.LabelFrame(root, text="连接设置", padding=12)
        settings.grid(row=1, column=0, sticky="ew", pady=(0, 14))
        settings.columnconfigure(1, weight=1)
        settings.columnconfigure(3, weight=1)
        ttk.Label(settings, text="API 基本网址").grid(row=0, column=0, sticky="w", padx=(0, 8), pady=5)
        self.base_url = ttk.Entry(settings)
        self.base_url.insert(0, "https://kktoken.cc/v1")
        self.base_url.grid(row=0, column=1, sticky="ew", pady=5)
        ttk.Label(settings, text="API 密钥").grid(row=0, column=2, sticky="w", padx=(18, 8), pady=5)
        self.api_key = ttk.Entry(settings, show="*")
        self.api_key.grid(row=0, column=3, sticky="ew", pady=5)
        self.show_key = tk.BooleanVar(value=False)
        ttk.Checkbutton(settings, text="显示", variable=self.show_key, command=self._toggle_key).grid(row=0, column=4, padx=(8, 0))
        self.fetch_button = ttk.Button(settings, text="拉取模型", command=self.fetch_models, style="Accent.TButton")
        self.fetch_button.grid(row=0, column=5, padx=(18, 0))

        content = ttk.Panedwindow(root, orient="horizontal")
        content.grid(row=2, column=0, sticky="nsew")
        left = ttk.Frame(content, padding=(0, 0, 10, 0))
        right = ttk.Frame(content, padding=(10, 0, 0, 0))
        content.add(left, weight=1)
        content.add(right, weight=2)
        left.rowconfigure(2, weight=1)
        left.columnconfigure(0, weight=1)
        ttk.Label(left, text="模型（可选择或手动输入）").grid(row=0, column=0, sticky="w")
        self.model_var = tk.StringVar()
        self.model_combo = ttk.Combobox(left, textvariable=self.model_var, state="normal")
        self.model_combo.grid(row=1, column=0, sticky="ew", pady=(6, 12))
        self.model_list = scrolledtext.ScrolledText(left, height=10, state="disabled", wrap="word", font=("Consolas", 10))
        self.model_list.grid(row=2, column=0, sticky="nsew")

        right.rowconfigure(3, weight=1)
        right.columnconfigure(0, weight=1)
        ttk.Label(right, text="消息内容").grid(row=0, column=0, sticky="w")
        self.message = scrolledtext.ScrolledText(right, height=8, wrap="word", font=("Segoe UI", 10))
        self.message.grid(row=1, column=0, sticky="ew", pady=(6, 12))
        self.message.insert("1.0", "Reply with OK.")
        controls = ttk.Frame(right)
        controls.grid(row=2, column=0, sticky="ew", pady=(0, 12))
        ttk.Label(controls, text="最大输出 token").pack(side="left")
        self.max_tokens = ttk.Spinbox(controls, from_=1, to=32768, width=8)
        self.max_tokens.set(512)
        self.max_tokens.pack(side="left", padx=(8, 20))
        self.send_button = ttk.Button(controls, text="发送消息", command=self.send_message, style="Accent.TButton")
        self.send_button.pack(side="left")
        ttk.Button(controls, text="清空结果", command=self.clear_output).pack(side="left", padx=8)
        ttk.Label(right, text="响应结果").grid(row=3, column=0, sticky="nw")
        self.output = scrolledtext.ScrolledText(right, state="disabled", wrap="word", font=("Consolas", 10), background="#fbfcfe")
        self.output.grid(row=4, column=0, sticky="nsew", pady=(6, 0))

        footer = ttk.Label(root, text="提示：密钥只保留在本次运行内，不会自动写入磁盘。", style="Muted.TLabel")
        footer.grid(row=3, column=0, sticky="w", pady=(12, 0))

    def _toggle_key(self):
        self.api_key.configure(show="" if self.show_key.get() else "*")

    def _url(self, path):
        base = self.base_url.get().strip().rstrip("/")
        return base + "/" + path.lstrip("/")

    def _headers(self):
        key = self.api_key.get().strip()
        if not key:
            raise ValueError("请先填写 API 密钥")
        return {"Authorization": "Bearer " + key, "Content-Type": "application/json", "Accept": "application/json"}

    def _request(self, method, path, payload=None):
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request = Request(self._url(path), data=data, headers=self._headers(), method=method)
        started = time.perf_counter()
        try:
            with urlopen(request, timeout=60) as response:
                raw = response.read().decode("utf-8", errors="replace")
                return response.status, time.perf_counter() - started, self._parse(raw)
        except HTTPError as error:
            raw = error.read().decode("utf-8", errors="replace")
            return error.code, time.perf_counter() - started, self._parse(raw) if raw else {"error": error.reason}
        except URLError as error:
            raise RuntimeError("网络请求失败：" + str(error.reason)) from error

    @staticmethod
    def _parse(raw):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw

    @staticmethod
    def _status_text(status, body):
        if isinstance(body, dict) and (body.get("error_code") == 1010 or body.get("error_name") == "browser_signature_banned"):
            return "HTTP 403 · Cloudflare 1010：服务商封禁了客户端指纹"
        return f"HTTP {status}"

    def _run_async(self, work):
        if self.busy:
            return
        self.busy = True
        self.fetch_button.configure(state="disabled")
        self.send_button.configure(state="disabled")
        self.status_var.set("请求中...")

        def runner():
            try:
                self.result_queue.put((True, work()))
            except Exception as error:
                self.result_queue.put((False, str(error)))

        threading.Thread(target=runner, daemon=True).start()

    def fetch_models(self):
        def work():
            return self._request("GET", "/models")
        self._run_async(work)

    def send_message(self):
        model = self.model_var.get().strip()
        if not model:
            messagebox.showwarning("缺少模型", "请选择一个模型，或直接输入模型 ID。")
            return
        text = self.message.get("1.0", "end").strip()
        if not text:
            messagebox.showwarning("缺少消息", "请输入消息内容。")
            return
        try:
            max_tokens = max(1, int(self.max_tokens.get()))
        except ValueError:
            messagebox.showwarning("参数错误", "最大输出 token 必须是整数。")
            return
        payload = {"model": model, "messages": [{"role": "user", "content": text}], "max_tokens": max_tokens}
        self._run_async(lambda: self._request("POST", "/chat/completions", payload))

    def _drain_results(self):
        try:
            success, result = self.result_queue.get_nowait()
        except queue.Empty:
            self.after(100, self._drain_results)
            return
        self.busy = False
        self.fetch_button.configure(state="normal")
        self.send_button.configure(state="normal")
        if not success:
            self.status_var.set("失败")
            self._write_output(result)
        else:
            status, duration, body = result
            status_text = self._status_text(status, body)
            self.status_var.set(f"{status_text} · {duration:.2f}s")
            rendered = json.dumps(body, ensure_ascii=False, indent=2) if not isinstance(body, str) else body
            if isinstance(body, dict) and (body.get("error_code") == 1010 or body.get("error_name") == "browser_signature_banned"):
                rendered = (
                    "诊断：这是服务商 Cloudflare 的 Error 1010。\n"
                    "原因：服务商按客户端指纹拒绝了请求，不是模型名称或消息格式错误。\n"
                    "处理：不要重复重试；请联系 API 服务商解除封禁，或改用服务商提供的官方 API 域名/入口。\n\n"
                    + rendered
                )
            self._write_output(rendered)
            if isinstance(body, dict) and isinstance(body.get("data"), list):
                self.models = [item.get("id") for item in body["data"] if isinstance(item, dict) and item.get("id")]
                self.model_combo["values"] = self.models
                self.model_list.configure(state="normal")
                self.model_list.delete("1.0", "end")
                self.model_list.insert("1.0", "\n".join(self.models) if self.models else "接口返回 0 个模型")
                self.model_list.configure(state="disabled")
                if self.models:
                    self.model_combo.current(0)
        self.after(100, self._drain_results)

    def _write_output(self, text):
        self.output.configure(state="normal")
        self.output.delete("1.0", "end")
        self.output.insert("1.0", text)
        self.output.configure(state="disabled")

    def clear_output(self):
        self._write_output("")


if __name__ == "__main__":
    ApiTester().mainloop()
