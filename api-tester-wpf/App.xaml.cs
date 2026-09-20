using System;
using System.IO;
using System.Text;
using System.Windows;
using System.Windows.Threading;

namespace ApiTester.Wpf
{
    public partial class App : Application
    {
        public App()
        {
            // 兜底：UI 线程上任何未捕获异常都在这里落地，写 crash.txt 并弹提示，
            // 避免出现窗口直接消失或界面卡死却没有任何线索的情况。
            DispatcherUnhandledException += OnDispatcherUnhandledException;
        }

        private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
        {
            try
            {
                var sb = new StringBuilder();
                sb.Append('[').Append(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff")).Append("] UI 线程未处理异常").AppendLine();
                sb.AppendLine("  type:    " + e.Exception.GetType().FullName);
                sb.AppendLine("  message: " + e.Exception.Message);
                for (var inner = e.Exception.InnerException; inner != null; inner = inner.InnerException)
                {
                    sb.AppendLine("  inner:   " + inner.GetType().FullName + " :: " + inner.Message);
                }
                sb.AppendLine("  stack:   " + e.Exception.StackTrace);
                var path = Path.Combine(AppContext.BaseDirectory, "crash.txt");
                File.AppendAllText(path, sb.ToString());
            }
            catch
            {
                // 写日志失败也不能再抛。
            }

            MessageBox.Show(
                "界面发生未处理异常，已记录到 crash.txt：\n\n" + e.Exception.Message,
                "API 测试工作台",
                MessageBoxButton.OK,
                MessageBoxImage.Error);

            e.Handled = true;
        }
    }
}
