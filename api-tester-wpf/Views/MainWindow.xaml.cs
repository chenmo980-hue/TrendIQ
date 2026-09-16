using ApiTester.Wpf.ViewModels;
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
            DataContextChanged += (_, _) =>
            {
                if (DataContext is MainViewModel viewModel)
                {
                    ApiKeyPasswordBox.Password = viewModel.ApiKey;
                }
            };
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
            if (DataContext is MainViewModel viewModel)
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
