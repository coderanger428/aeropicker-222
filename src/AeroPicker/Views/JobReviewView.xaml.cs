using System.Windows;
using System.Windows.Controls;
using AeroPicker.Mock;

namespace AeroPicker.Views;

public partial class JobReviewView : UserControl
{
    private readonly MockStore _store;

    public JobReviewView(MockStore store)
    {
        _store = store;
        InitializeComponent();
        DataContext = store;
        FlowStepBar.Fill(Steps, AppScreen.JobReview);
        store.Draft.Skills.CollectionChanged += (_, _) => Refresh();
        SkillEntry.Catalog = store.TechNames;
        Loaded += (_, _) => Refresh();
    }

    private void Refresh_TextChanged(object sender, TextChangedEventArgs e) => Refresh();

    private void Refresh()
    {
        SkillCaption.Value = _store.Draft.Skills.Count == 0 ? "" : "set";
        RefreshOptional("location", _store.Draft.Location, LocationBox, LocationSkip, LocationFill, LocationCaption);
        RefreshOptional("seniority", _store.Draft.Seniority, SeniorityBox, SenioritySkip, SeniorityFill, SeniorityCaption);
        GenerateButton.IsEnabled = _store.CanGenerate;
        HintText.Visibility = _store.CanGenerate ? Visibility.Collapsed : Visibility.Visible;
    }

    private void RefreshOptional(string key, string value, TextBox box, Button skip, Button fill, FieldCaption caption)
    {
        var skipped = _store.Draft.Skipped.Contains(key);
        box.Visibility = skipped ? Visibility.Collapsed : Visibility.Visible;
        skip.Visibility = !skipped && string.IsNullOrWhiteSpace(value) ? Visibility.Visible : Visibility.Collapsed;
        fill.Visibility = skipped ? Visibility.Visible : Visibility.Collapsed;
        caption.IsSkipped = skipped;
    }

    private void Skill_Committed(object sender, string skill)
    {
        if (!_store.Draft.Skills.Any(existing => existing.Equals(skill, StringComparison.OrdinalIgnoreCase)))
            _store.Draft.Skills.Add(skill);
    }

    private void RemoveSkill_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is string skill)
            _store.Draft.Skills.Remove(skill);
    }

    private void SkipLocation_Click(object sender, RoutedEventArgs e)
    {
        LocationBox.Text = "";
        _store.Draft.Skipped.Add("location");
        Refresh();
    }

    private void FillLocation_Click(object sender, RoutedEventArgs e)
    {
        _store.Draft.Skipped.Remove("location");
        Refresh();
    }

    private void SkipSeniority_Click(object sender, RoutedEventArgs e)
    {
        SeniorityBox.Text = "";
        _store.Draft.Skipped.Add("seniority");
        Refresh();
    }

    private void FillSeniority_Click(object sender, RoutedEventArgs e)
    {
        _store.Draft.Skipped.Remove("seniority");
        Refresh();
    }

    private void Back_Click(object sender, RoutedEventArgs e) => _store.Go(AppScreen.JobDescription);

    private void Generate_Click(object sender, RoutedEventArgs e)
    {
        if (_store.CanGenerate)
            _store.Go(AppScreen.Export);
    }
}
