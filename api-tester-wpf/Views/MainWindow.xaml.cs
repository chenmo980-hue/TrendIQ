using ApiTester.Wpf.ViewModels;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;

namespace ApiTester.Wpf.Views
{
    public partial class MainWindow : DMSkin.DMSkinWindow
    {
        private bool _revealingKey;

        public MainWindow()
        {
            InitializeComponent();
            DataContextChanged += OnDataContextChanged;
            Closing += OnWindowClosing;

            // XAML 里的 <DMSkinWindow.DataContext> 在 InitializeComponent() 期间就已经赋值，
            // 那一刻本类尚未订阅 DataContextChanged，所以首屏不会触发同步——
            // 表现为：密钥明明存在磁盘上，输入框却是空的。
            Loaded += (sender, args) =>
            {
                if (DataContext is MainViewModel viewModel)
                {
                    SyncApiKeyBoxes(viewModel);
                }
            };
        }

        private void OnDataContextChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            if (e.OldValue is MainViewModel previous)
            {
                previous.PropertyChanged -= OnViewModelPropertyChanged;
            }

            if (e.NewValue is MainViewModel current)
            {
                current.PropertyChanged += OnViewModelPropertyChanged;
                SyncApiKeyBoxes(current);
            }
        }

        private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (sender is MainViewModel viewModel && e.PropertyName == nameof(MainViewModel.ApiKey))
            {
                SyncApiKeyBoxes(viewModel);
            }
        }

        private void SyncApiKeyBoxes(MainViewModel viewModel)
        {
            if (_revealingKey)
            {
                return;
            }

            if (ApiKeyPasswordBox.Password != viewModel.ApiKey)
            {
                ApiKeyPasswordBox.Password = viewModel.ApiKey;
            }

            if (ApiKeyTextBox.Text != viewModel.ApiKey)
            {
                ApiKeyTextBox.Text = viewModel.ApiKey;
            }
        }

        private void OnWindowClosing(object? sender, CancelEventArgs e)
        {
            (DataContext as MainViewModel)?.PersistSettings(false);
        }

        private void ApiKeyPasswordBox_OnPasswordChanged(object sender, RoutedEventArgs e)
        {
            if (DataContext is MainViewModel viewModel && !_revealingKey)
            {
                viewModel.ApiKey = ApiKeyPasswordBox.Password;
            }
        }

        private void ApiKeyTextBox_OnTextChanged(object sender, TextChangedEventArgs e)
        {
            if (DataContext is MainViewModel viewModel && !_revealingKey)
            {
                viewModel.ApiKey = ApiKeyTextBox.Text;
            }
        }

        private void RevealKeyButton_OnClick(object sender, RoutedEventArgs e)
        {
            _revealingKey = true;
            var showPlainText = ApiKeyTextBox.Visibility == Visibility.Collapsed;
            ApiKeyTextBox.Visibility = showPlainText ? Visibility.Visible : Visibility.Collapsed;
            ApiKeyPasswordBox.Visibility = showPlainText ? Visibility.Collapsed : Visibility.Visible;
            if (showPlainText)
            {
                ApiKeyTextBox.Text = ApiKeyPasswordBox.Password;
            }
            else
            {
                ApiKeyPasswordBox.Password = ApiKeyTextBox.Text;
            }
            _revealingKey = false;
        }

        private void ModelTag_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.FrameworkElement fe && fe.Tag is string model && DataContext is MainViewModel vm)
            {
                vm.SelectModelFromTag(model);
            }
        }

        private void CopyModelTag_OnClick(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.FrameworkElement fe && fe.Tag is string model && DataContext is MainViewModel vm)
            {
                vm.CopyModelName(model);
            }
        }

        private void ClearOutputButton_OnClick(object sender, RoutedEventArgs e)
        {
            // 不走 Command，直接调 VM 的公开方法——任何时候都能清空。
            if (DataContext is MainViewModel vm)
            {
                vm.ClearOutput();
            }
        }

        // 下拉框可编辑：过滤走 ComboBox 自己的默认 CollectionView（只设 Filter + Refresh），
// 不重建 ItemsSource 集合。清空/重建集合会让可编辑 ComboBox 重算选中项并回写 Text，
// 再次触发 TextChanged，形成绑定回环把 UI 线程卡死——用 CollectionView 从根上避免。
private bool _filterHooked;
private string _filterKeyword = string.Empty;
private bool _refreshing;

private void ModelComboBox_OnTextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
{
    if (!(DataContext is MainViewModel vm) || !(sender is System.Windows.Controls.ComboBox cb)) { return; }
    if (!_filterHooked)
    {
        var view = System.Windows.Data.CollectionViewSource.GetDefaultView(vm.Models);
        view.Filter = o => MatchesFilter(o as ModelItem);
        _filterHooked = true;
    }
    if (_refreshing) { return; }

    var text = cb.Text ?? string.Empty;
    if (string.IsNullOrWhiteSpace(text) || vm.Models.Any(m => m.Name.Equals(text.Trim(), StringComparison.OrdinalIgnoreCase)))
    {
        _filterKeyword = string.Empty;   // 空输入或已选中完整模型名 -> 显示全部
    }
    else
    {
        _filterKeyword = text.Trim();    // 正在输入关键字 -> 模糊过滤
    }

    // 延到本轮回合结束后再刷新视图，避免在 TextChanged 处理中改动 ItemsSource
    _refreshing = true;
    Dispatcher.BeginInvoke(new Action(() =>
    {
        try
        {
            System.Windows.Data.CollectionViewSource.GetDefaultView(vm.Models).Refresh();
        }
        finally
        {
            _refreshing = false;
        }
    }), System.Windows.Threading.DispatcherPriority.Background);
}

private bool MatchesFilter(ModelItem item)
{
    if (item == null) { return false; }
    if (string.IsNullOrEmpty(_filterKeyword)) { return true; }
    return item.Name.IndexOf(_filterKeyword, StringComparison.OrdinalIgnoreCase) >= 0;
}
    }
}
