using System.Windows;
using System.Windows.Controls;
using AeroPicker.Mock;

namespace AeroPicker.Views;

public partial class LicenceView : UserControl
{
    private readonly MockStore _store;

    public LicenceView(MockStore store)
    {
        _store = store;
        InitializeComponent();
        PathText.Text = $"The key is saved as a binary file at {_store.LicencePath}. Later runs read that file.";
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        var error = _store.SaveLicence(KeyBox.Text);
        ErrorText.Text = error ?? "";
        ErrorText.Visibility = error is null ? Visibility.Collapsed : Visibility.Visible;
    }
}
