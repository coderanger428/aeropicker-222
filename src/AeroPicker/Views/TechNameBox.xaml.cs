using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using AeroPicker.Mock;

namespace AeroPicker.Views;

public partial class TechNameBox : UserControl
{
    public TechNameBox()
    {
        InitializeComponent();
    }

    public TechCatalog? Catalog { get; set; }

    public event EventHandler<string>? Committed;

    private void Input_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (Catalog == null)
        {
            SuggestPopup.IsOpen = false;
            return;
        }

        var matches = Catalog.Suggest(Input.Text);
        Suggestions.ItemsSource = matches;
        Suggestions.SelectedIndex = -1;
        SuggestPopup.Width = Math.Max(Input.ActualWidth, 220);
        SuggestPopup.IsOpen = matches.Count > 0;
    }

    private void Input_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Escape)
        {
            SuggestPopup.IsOpen = false;
            e.Handled = true;
            return;
        }

        if (SuggestPopup.IsOpen && e.Key == Key.Down)
        {
            Suggestions.SelectedIndex = Math.Min(Suggestions.SelectedIndex + 1, Suggestions.Items.Count - 1);
            Suggestions.ScrollIntoView(Suggestions.SelectedItem);
            e.Handled = true;
            return;
        }

        if (SuggestPopup.IsOpen && e.Key == Key.Up)
        {
            Suggestions.SelectedIndex = Math.Max(Suggestions.SelectedIndex - 1, -1);
            if (Suggestions.SelectedItem != null)
                Suggestions.ScrollIntoView(Suggestions.SelectedItem);
            e.Handled = true;
            return;
        }

        if (e.Key is Key.Enter or Key.Return)
        {
            CommitSelection();
            e.Handled = true;
        }
    }

    private void Input_LostKeyboardFocus(object sender, KeyboardFocusChangedEventArgs e)
    {
        if (e.NewFocus is DependencyObject focus && Suggestions.IsAncestorOf(focus))
            return;
        SuggestPopup.IsOpen = false;
    }

    private void Suggestions_PreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (ItemsControl.ContainerFromElement(Suggestions, e.OriginalSource as DependencyObject) is not ListBoxItem { Content: string name })
            return;
        Commit(name);
        e.Handled = true;
    }

    private void Add_Click(object sender, RoutedEventArgs e) => CommitSelection();

    private void CommitSelection()
    {
        var chosen = SuggestPopup.IsOpen && Suggestions.SelectedItem is string selected
            ? selected
            : Input.Text;
        Commit(chosen);
    }

    private void Commit(string raw)
    {
        if (Catalog == null)
            return;

        var name = Catalog.Resolve(raw);
        if (name.Length == 0)
            return;

        Input.Clear();
        SuggestPopup.IsOpen = false;
        Committed?.Invoke(this, name);
        Input.Focus();
    }
}
