using System.Windows;
using System.Windows.Controls;
using AeroPicker.Mock;

namespace AeroPicker.Views;

public partial class JobDescriptionView : UserControl
{
    private const string Sample = """
        Company: Northwind Labs
        Role: Backend Engineer
        Location: Seoul (hybrid)
        Seniority: Mid-level

        Northwind Labs is hiring a Backend Engineer to build hiring tools used by internal teams.

        Requirements
        - C#
        - SQL
        - REST APIs
        - Clear technical writing

        You will work with product and design on resume generation workflows.
        """;

    private readonly MockStore _store;

    public JobDescriptionView(MockStore store)
    {
        _store = store;
        InitializeComponent();
        DataContext = store;
        FlowStepBar.Fill(Steps, AppScreen.JobDescription);

        if (!string.IsNullOrEmpty(store.StatusMessage))
            ShowBanner(store.StatusMessage);
        else if (store.Applications.Count > 0)
            ShowBanner($"Last application: {store.Applications[0].Company} · {store.Applications[0].Role}");
    }

    private void ShowBanner(string text)
    {
        BannerText.Text = text;
        Banner.Visibility = Visibility.Visible;
    }

    private void Sample_Click(object sender, RoutedEventArgs e)
    {
        DescriptionBox.Text = Sample.Trim();
        ErrorText.Visibility = Visibility.Collapsed;
    }

    private void Next_Click(object sender, RoutedEventArgs e)
    {
        var error = _store.BeginReview();
        ErrorText.Text = error ?? "";
        ErrorText.Visibility = error is null ? Visibility.Collapsed : Visibility.Visible;
    }
}
