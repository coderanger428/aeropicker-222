using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
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
        "The more specific the master resume is, the sharper each tailored resume can be.",
        "Add the roles you have held. Put one achievement on each line.",
        "Include tools, domains, and the kinds of work you can defend in an interview.",
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
        Eyebrow.Visibility = store.Profile.Completed ? Visibility.Collapsed : Visibility.Visible;
        ShowStep();
    }

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

    private void Close_Click(object sender, RoutedEventArgs e) => _store.CloseWizard();

    private bool LeaveCurrent()
    {
        if (_store.WizardStep == 0 && string.IsNullOrWhiteSpace(_store.Profile.FullName))
        {
            ShowError("Enter your name to continue.");
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
        if (!_store.Profile.Skills.Any(existing => existing.Equals(skill, StringComparison.OrdinalIgnoreCase)))
            _store.Profile.Skills.Add(skill);
        SkillBox.Clear();
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
