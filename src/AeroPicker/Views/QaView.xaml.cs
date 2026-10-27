using System.Windows;
using System.Windows.Controls;
using AeroPicker.Mock;
using AeroPicker.Mock.Models;

namespace AeroPicker.Views;

public partial class QaView : UserControl
{
    private readonly MockStore _store;

    public QaView(MockStore store)
    {
        _store = store;
        InitializeComponent();
        DataContext = store;
        FlowStepBar.Fill(Steps, AppScreen.Qa);
        if (!string.IsNullOrEmpty(store.Draft.ExportFolder))
            PathText.Text = $"Resume and cover letter written to {store.Draft.ExportFolder}.";
    }

    private void Draft_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(QuestionBox.Text))
        {
            ShowError("Enter a question first.");
            return;
        }

        ShowError(null);
        AnswerBox.Text = MockTailor.Answer(_store.Profile, _store.Draft, QuestionBox.Text);
    }

    private void Keep_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(QuestionBox.Text) || string.IsNullOrWhiteSpace(AnswerBox.Text))
        {
            ShowError("Enter a question and an answer first.");
            return;
        }

        _store.Draft.Questions.Add(new QaPair
        {
            Question = QuestionBox.Text.Trim(),
            Answer = AnswerBox.Text.Trim()
        });
        QuestionBox.Clear();
        AnswerBox.Clear();
        ShowError(null);
    }

    private void Remove_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is QaPair pair)
            _store.Draft.Questions.Remove(pair);
    }

    private void Back_Click(object sender, RoutedEventArgs e) => _store.Go(AppScreen.Export);

    private void Finish_Click(object sender, RoutedEventArgs e) => _store.FinishApplication();

    private void ShowError(string? message)
    {
        ErrorText.Text = message ?? "";
        ErrorText.Visibility = message is null ? Visibility.Collapsed : Visibility.Visible;
    }
}
