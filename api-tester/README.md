# API 测试工作台

Windows 10 原生桌面工具，支持兼容 OpenAI API 的服务：

- 配置 API 基本网址和密钥
- 拉取 `/models`
- 选择模型并调用 `/chat/completions`
- 查看 HTTP 状态、耗时和原始 JSON 响应
- 密钥仅保留在当前进程内，不写入文件

## 运行

```powershell
python api_tester.py
```

## 打包 EXE

需要 Python 3.9+ 和 PyInstaller：

```powershell
python -m pip install pyinstaller
powershell -ExecutionPolicy Bypass -File .\build_exe.ps1
```

生成文件：`dist\ApiTester.exe`。
