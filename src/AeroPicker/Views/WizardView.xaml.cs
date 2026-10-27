using System.Collections.Specialized;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using AeroPicker.Mock;
using AeroPicker.Mock.Models;

namespace AeroPicker.Views;

public partial class WizardView : UserControl
{
    private static readonly string[] Titles =
    [
        "Personal information",
        "Career history",
        "Master skill set",
        "Projects",
        "Education",
        "Certificates and achievements",
        "API token"
    ];

    private static readonly string[] Copy =
    [
        "Full name, email, phone, location, and LinkedIn are required. GitHub, X, and Facebook are optional.",
        "Add each company, where it was, and when you worked there. End date is required unless you currently work there.",
        "Start typing a technology. Pick a suggestion, or add a name that is not listed yet.",
        "Name the project and the role you played on it.",
        "Add degrees, diplomas, or equivalent study.",
        "Add certificates and achievements you may want a tailored resume to mention.",
        "Paste a token from the provider you will use. OpenAI is the one this mock is aimed at."
    ];

    private readonly MockStore _store;
    private readonly StackPanel[] _steps;
    private readonly Button[] _stepButtons;

    public WizardView(MockStore store)
    {
        _store = store;
        InitializeComponent();
        DataContext = store;
        _steps = [Step0, Step1, Step2, Step3, Step4, Step5, Step6];
        _stepButtons = [StepButton0, StepButton1, StepButton2, StepButton3, StepButton4, StepButton5, StepButton6];
        if (store.HasToken)
            TokenSaved.Visibility = Visibility.Visible;
        TokenCaption.IsFilled = store.HasToken;
        Eyebrow.Visibility = store.Profile.Completed ? Visibility.Collapsed : Visibility.Visible;
        store.Profile.Skills.CollectionChanged += OnSkillsChanged;
        Unloaded += (_, _) => store.Profile.Skills.CollectionChanged -= OnSkillsChanged;
        UpdateSkillCaption();
        SkillEntry.Catalog = store.TechNames;
        ShowStep();
    }

    private void OnSkillsChanged(object? sender, NotifyCollectionChangedEventArgs e) => UpdateSkillCaption();

    private void UpdateSkillCaption() =>
        SkillCaption.Value = _store.Profile.Skills.Count == 0 ? "" : "set";

    private void TokenBox_PasswordChanged(object sender, RoutedEventArgs e) =>
        TokenCaption.IsFilled = _store.HasToken || TokenBox.Password.Length > 0;

    private void ShowStep()
    {
        var step = Math.Clamp(_store.WizardStep, 0, Titles.Length - 1);
        _store.WizardStep = step;
        Heading.Text = Titles[step];
        Lede.Text = Copy[step];
        for (var i = 0; i < _steps.Length; i++)
        {
            _steps[i].Visibility = i == step ? Visibility.Visible : Visibility.Collapsed;
            var button = _stepButtons[i];
            button.Content = $"{i + 1}   {Titles[i]}";
            button.IsEnabled = _store.Profile.Completed || i <= step;
            button.Opacity = button.IsEnabled ? 1 : 0.45;
            button.Background = i == step
                ? new SolidColorBrush(Colors.White)
                : Brushes.Transparent;
            button.FontWeight = i == step ? FontWeights.SemiBold : FontWeights.Normal;
        }

        var canClose = _store.CanCloseWizard;
        CloseButton.Visibility = canClose ? Visibility.Visible : Visibility.Collapsed;
        BackButton.Visibility = !canClose && step > 0 ? Visibility.Visible : Visibility.Collapsed;
        NextButton.Content = step < 6
            ? "Next"
            : _store.Profile.Completed ? "Save" : "Finish setup";
    }

    private void Step_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button { Tag: string tag } || !int.TryParse(tag, out var step))
            return;
        if (!_store.Profile.Completed && step > _store.WizardStep)
            return;
        if (!LeaveCurrent())
            return;
        _store.WizardStep = step;
        ShowStep();
    }

    private void Back_Click(object sender, RoutedEventArgs e)
    {
        if (_store.WizardStep == 0)
            return;
        ShowError(null);
        _store.SaveProfile();
        _store.WizardStep--;
        ShowStep();
    }

    private void Next_Click(object sender, RoutedEventArgs e)
    {
        if (_store.WizardStep >= 6)
        {
            ShowError(_store.CompleteSetup(TokenBox.Password));
            return;
        }

        if (!LeaveCurrent())
            return;
        _store.WizardStep++;
        ShowStep();
    }

    private void Close_Click(object sender, RoutedEventArgs e)
    {
        var error = ProfileRules.ValidateForSave(_store.Profile);
        if (error != null)
        {
            ShowError(error);
            return;
        }

        _store.CloseWizard();
    }

    private bool LeaveCurrent()
    {
        var error = ProfileRules.ValidateStep(_store.Profile, _store.WizardStep);
        if (error != null)
        {
            ShowError(error);
            return false;
        }

        ShowError(null);
        _store.SaveProfile();
        return true;
    }

    private void ShowError(string? message)
    {
        ErrorText.Text = message ?? "";
        ErrorText.Visibility = message is null ? Visibility.Collapsed : Visibility.Visible;
    }

    private void Skill_Committed(object sender, string skill)
    {
        if (!_store.Profile.Skills.Any(existing => existing.Equals(skill, StringComparison.OrdinalIgnoreCase)))
            _store.Profile.Skills.Add(skill);
    }

    private void RemoveSkill_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is string skill)
            _store.Profile.Skills.Remove(skill);
    }

    private void AddCareer_Click(object sender, RoutedEventArgs e) => _store.Profile.Career.Add(new CareerEntry());
    private void AddProject_Click(object sender, RoutedEventArgs e) => _store.Profile.Projects.Add(new ProjectEntry());
    private void AddEducation_Click(object sender, RoutedEventArgs e) => _store.Profile.Education.Add(new EducationEntry());
    private void AddCredential_Click(object sender, RoutedEventArgs e) => _store.Profile.Credentials.Add(new CredentialEntry());

    private void RemoveCareer_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is CareerEntry entry)
            _store.Profile.Career.Remove(entry);
    }

    private void RemoveProject_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is ProjectEntry entry)
            _store.Profile.Projects.Remove(entry);
    }

    private void RemoveEducation_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is EducationEntry entry)
            _store.Profile.Education.Remove(entry);
    }

    private void RemoveCredential_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is CredentialEntry entry)
            _store.Profile.Credentials.Remove(entry);
    }
}
