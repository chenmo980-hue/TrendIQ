# API Tester WPF

使用 .NET 8 WPF 与 DMSkin 重做的 OpenAI 兼容接口测试工具。

## 功能

- 配置 API 基本网址与密钥
- 拉取 `/models`
- 选择或手动输入模型
- 发送 `/chat/completions`
- 查看格式化 JSON 响应与错误诊断
- 管理默认配置与多份具名配置，可新建、读取和切换
- DMSkin 自定义窗口、标题栏和深色界面

具名配置保存在默认 `settings.json` 所在目录的 `configs` 子目录中；输入名称后点击“新建配置”，从下拉框选择后点击“读取配置”即可切换。

## 构建

```powershell
dotnet build api-tester-wpf/ApiTester.Wpf.csproj -c Release
```

## 运行

```powershell
dotnet run --project api-tester-wpf/ApiTester.Wpf.csproj
```

配置会写入可写目录；默认配置使用 `settings.json`，具名配置保存在 `configs` 子目录。
