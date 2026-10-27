using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
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
        UpdateEmpty();
        Loaded += (_, _) => Dispatcher.InvokeAsync(QuestionBox.Focus, DispatcherPriority.Input);
    }

    private void QuestionBox_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key is not (Key.Enter or Key.Return) || Keyboard.Modifiers == ModifierKeys.Shift)
            return;

        DraftAnswer();
        e.Handled = true;
    }

    private void Draft_Click(object sender, RoutedEventArgs e) => DraftAnswer();

    private void DraftAnswer()
    {
        if (string.IsNullOrWhiteSpace(QuestionBox.Text))
        {
            ShowNote("Enter a question first.", error: true);
            QuestionBox.Focus();
            return;
        }

        var question = QuestionBox.Text.Trim();
        _store.Draft.Questions.Add(new QaPair
        {
            Question = question,
            Answer = MockTailor.Answer(_store.Profile, _store.Draft, question)
        });
        QuestionBox.Clear();
        ShowNote(null, error: false);
        UpdateEmpty();
        QuestionBox.Focus();
        Dispatcher.InvokeAsync(TranscriptScroll.ScrollToEnd, DispatcherPriority.Loaded);
    }

    private void Copy_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is not QaPair pair || pair.Answer.Length == 0)
            return;

        try
        {
            Clipboard.SetText(pair.Answer);
            ShowNote("Answer copied.", error: false);
        }
        catch (ExternalException)
        {
            ShowNote("Could not copy the answer.", error: true);
        }
    }

    private void Back_Click(object sender, RoutedEventArgs e) => _store.Go(AppScreen.Export);

    private void Finish_Click(object sender, RoutedEventArgs e) => _store.FinishApplication();

    private void UpdateEmpty()
    {
        EmptyText.Visibility = _store.Draft.Questions.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ShowNote(string? message, bool error)
    {
        ErrorText.Text = message ?? "";
        ErrorText.Foreground = error
            ? new SolidColorBrush(Color.FromRgb(0x8A, 0x3D, 0x12))
            : new SolidColorBrush(Color.FromRgb(0x1E, 0x4D, 0x3A));
        ErrorText.Visibility = message is null ? Visibility.Collapsed : Visibility.Visible;
    }
}
