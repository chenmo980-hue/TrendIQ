# API Tester WPF

使用 .NET 8 WPF 与 DMSkin 重做的 OpenAI 兼容接口测试工具。

## 功能

- 配置 API 基本网址与密钥
- 拉取 `/models`
- 选择或手动输入模型
- 发送 `/chat/completions`
- 查看格式化 JSON 响应与错误诊断
- DMSkin 自定义窗口、标题栏和深色界面

## 构建

```powershell
dotnet build api-tester-wpf/ApiTester.Wpf.csproj -c Release
```

## 运行

```powershell
dotnet run --project api-tester-wpf/ApiTester.Wpf.csproj
```

密钥只保存在当前进程内存中，不会写入配置文件。
