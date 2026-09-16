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
    }
}
