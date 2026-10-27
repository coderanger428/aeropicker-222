using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
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
        Loaded += (_, _) => Refresh();
    }

    private void Refresh_TextChanged(object sender, TextChangedEventArgs e) => Refresh();

    private void Refresh()
    {
        SetPill(CompanyPill, _store.Draft.Company, required: true, skipped: false);
        SetPill(RolePill, _store.Draft.Role, required: true, skipped: false);
        SetPill(SkillPill, _store.Draft.Skills.Count == 0 ? "" : "set", required: true, skipped: false);
        RefreshOptional("location", _store.Draft.Location, LocationBox, LocationSkip, LocationFill, LocationPill);
        RefreshOptional("seniority", _store.Draft.Seniority, SeniorityBox, SenioritySkip, SeniorityFill, SeniorityPill);
        GenerateButton.IsEnabled = _store.CanGenerate;
        HintText.Visibility = _store.CanGenerate ? Visibility.Collapsed : Visibility.Visible;
    }

    private void RefreshOptional(string key, string value, TextBox box, Button skip, Button fill, TextBlock pill)
    {
        var skipped = _store.Draft.Skipped.Contains(key);
        box.Visibility = skipped ? Visibility.Collapsed : Visibility.Visible;
        skip.Visibility = !skipped && string.IsNullOrWhiteSpace(value) ? Visibility.Visible : Visibility.Collapsed;
        fill.Visibility = skipped ? Visibility.Visible : Visibility.Collapsed;
        SetPill(pill, value, required: false, skipped);
    }

    private static void SetPill(TextBlock pill, string value, bool required, bool skipped)
    {
        string text;
        Color background;
        Color foreground;
        if (skipped)
        {
            text = "Skipped";
            background = Color.FromRgb(0xF6, 0xF1, 0xE8);
            foreground = Color.FromRgb(0x6D, 0x65, 0x5C);
        }
        else if (string.IsNullOrWhiteSpace(value))
        {
            text = required ? "Needed" : "Optional";
            background = required ? Color.FromRgb(0xF8, 0xEC, 0xE3) : Color.FromRgb(0xF6, 0xF1, 0xE8);
            foreground = required ? Color.FromRgb(0x8A, 0x3D, 0x12) : Color.FromRgb(0x6D, 0x65, 0x5C);
        }
        else
        {
            text = "Filled";
            background = Color.FromRgb(0xE7, 0xF0, 0xEA);
            foreground = Color.FromRgb(0x1E, 0x4D, 0x3A);
        }

        pill.Text = text;
        pill.Foreground = new SolidColorBrush(foreground);
        pill.Background = new SolidColorBrush(background);
        pill.Padding = new Thickness(8, 2, 8, 2);
    }

    private void AddSkill_Click(object sender, RoutedEventArgs e) => AddSkill();

    private void SkillBox_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key != Key.Enter)
            return;
        AddSkill();
        e.Handled = true;
    }

    private void AddSkill()
    {
        var skill = SkillBox.Text.Trim();
        if (skill.Length == 0)
            return;
        if (!_store.Draft.Skills.Any(existing => existing.Equals(skill, StringComparison.OrdinalIgnoreCase)))
            _store.Draft.Skills.Add(skill);
        SkillBox.Clear();
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
