using System;
using System.IO;
using System.Linq;
using ApiTester.Wpf.Services;

var root = Path.Combine(Path.GetTempPath(), "trendiq-multiconfig-probe-" + Guid.NewGuid().ToString("N"));
var localConfig = Path.Combine(AppContext.BaseDirectory, "config");
if (Directory.Exists(localConfig))
{
    Directory.Delete(localConfig, recursive: true);
}
Environment.SetEnvironmentVariable("APPDATA", root);
Environment.SetEnvironmentVariable("LOCALAPPDATA", Path.Combine(root, "local"));

var store = new SettingsStore();
Console.WriteLine("FilePath=" + (store.FilePath ?? "<null>"));
Console.WriteLine("Root=" + root);
Assert(store.FilePath is not null, "应找到可写默认配置路径");
var first = new AppSettings
{
    BaseUrl = "https://example.test/v1",
    ApiKey = "probe-key",
    SelectedModel = "probe-model",
    MaxTokens = "256",
    Message = "你好😀"
};
Assert(store.CreateConfig("测试配置", first), "首次创建应成功");
Assert(store.ActiveConfigName == "测试配置", "创建后应切换为当前配置");
Assert(store.ConfigExists("测试配置"), "新配置应出现在列表中");
Assert(!store.CreateConfig("测试配置", first), "同名配置不应覆盖");
Assert(!store.CreateConfig("../穿越", first), "路径穿越名称应被拒绝");
var loaded = store.LoadConfig("测试配置");
Assert(loaded is not null, "具名配置应可读取");
Assert(loaded!.ApiKey == "probe-key" && loaded.Message == "你好😀", "具名配置内容应完整往返");
loaded.BaseUrl = "https://updated.test/v1";
Assert(store.Save(loaded), "当前配置应可保存");
var savedAgain = store.LoadConfig("测试配置");
Assert(savedAgain?.BaseUrl == "https://updated.test/v1", "保存后应读回更新值");
var names = store.ListConfigs().Select(item => item.Name).ToArray();
Assert(names.Contains("默认配置") && names.Contains("测试配置"), "默认与具名配置应同时可见");
Console.WriteLine("配置存储探针通过");
Console.WriteLine("根目录=" + root);
Console.WriteLine("配置=" + string.Join(",", names));

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
