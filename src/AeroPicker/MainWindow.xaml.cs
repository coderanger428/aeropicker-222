using System.Windows;
using AeroPicker.Mock;
using AeroPicker.Views;

namespace AeroPicker;

public partial class MainWindow : Window
{
    private readonly MockStore _store = new();

    public MainWindow()
    {
        InitializeComponent();
        _store.Changed += ShowScreen;
        ShowScreen();
    }

    private void ShowScreen()
    {
        var showLinks = _store.CanCloseWizard || _store.Screen >= AppScreen.JobDescription;
        ResumeButton.Visibility = showLinks ? Visibility.Visible : Visibility.Collapsed;
        TokenButton.Visibility = showLinks ? Visibility.Visible : Visibility.Collapsed;

        Host.Content = _store.Screen switch
        {
            AppScreen.Licence => new LicenceView(_store),
            AppScreen.Wizard => new WizardView(_store),
            AppScreen.JobDescription => new JobDescriptionView(_store),
            AppScreen.JobReview => new JobReviewView(_store),
            AppScreen.Export => new ExportView(_store),
            AppScreen.Qa => new QaView(_store),
            _ => new JobDescriptionView(_store)
        };
    }

    private void OpenResume_Click(object sender, RoutedEventArgs e) => _store.OpenWizard(0);

    private void OpenToken_Click(object sender, RoutedEventArgs e) => _store.OpenWizard(6);
}
