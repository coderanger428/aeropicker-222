using System.IO;
using System.Windows;
using System.Windows.Controls;
using AeroPicker.Mock;

namespace AeroPicker.Views;

public partial class ExportView : UserControl
{
    private readonly MockStore _store;
    private bool _ready;

    public ExportView(MockStore store)
    {
        _store = store;
        InitializeComponent();
        FlowStepBar.Fill(Steps, AppScreen.Export);
        Select(ResumeClassic, ResumeCompact, ResumeModern, store.Draft.ResumeTemplate);
        Select(LetterFormal, LetterBrief, null, store.Draft.CoverTemplate);
        _ready = true;
        RefreshPreview();
    }

    private static void Select(RadioButton first, RadioButton second, RadioButton? third, string value)
    {
        foreach (var button in new[] { first, second, third })
        {
            if (button?.Tag as string == value)
                button.IsChecked = true;
        }
    }

    private void ResumeTemplate_Checked(object sender, RoutedEventArgs e)
    {
        if (!_ready || sender is not RadioButton { IsChecked: true, Tag: string name })
            return;
        _store.Draft.ResumeTemplate = name;
        RefreshPreview();
    }

    private void CoverTemplate_Checked(object sender, RoutedEventArgs e)
    {
        if (!_ready || sender is not RadioButton { IsChecked: true, Tag: string name })
            return;
        _store.Draft.CoverTemplate = name;
        RefreshPreview();
    }

    private void RefreshPreview()
    {
        ResumePreview.Text = MockTailor.Resume(_store.Profile, _store.Draft);
        CoverPreview.Text = MockTailor.Cover(_store.Profile, _store.Draft);
    }

    private void Back_Click(object sender, RoutedEventArgs e) => _store.Go(AppScreen.JobReview);

    private void Export_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var error = _store.ExportFiles();
            ErrorText.Text = error ?? "";
            ErrorText.Visibility = error is null ? Visibility.Collapsed : Visibility.Visible;
        }
        catch (IOException ex)
        {
            ErrorText.Text = ex.Message;
            ErrorText.Visibility = Visibility.Visible;
        }
    }
}
