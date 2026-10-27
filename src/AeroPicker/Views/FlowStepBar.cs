using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using AeroPicker.Mock;

namespace AeroPicker.Views;

internal static class FlowStepBar
{
    private static readonly (string Label, AppScreen Screen)[] Steps =
    [
        ("Job description", AppScreen.JobDescription),
        ("Review", AppScreen.JobReview),
        ("Export", AppScreen.Export),
        ("Q/A", AppScreen.Qa)
    ];

    public static void Fill(Panel panel, AppScreen current)
    {
        panel.Children.Clear();
        foreach (var (label, screen) in Steps)
        {
            var active = screen == current;
            var done = screen < current;
            var border = new Border
            {
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(10, 4, 10, 4),
                Margin = new Thickness(0, 0, 8, 0),
                Background = new SolidColorBrush(active ? Color.FromRgb(0x1E, 0x4D, 0x3A) : Color.FromRgb(0xF6, 0xF1, 0xE8))
            };
            border.Child = new TextBlock
            {
                Text = label,
                FontSize = 13,
                Foreground = new SolidColorBrush(active ? Colors.White : done ? Color.FromRgb(0x1E, 0x4D, 0x3A) : Color.FromRgb(0x6D, 0x65, 0x5C))
            };
            panel.Children.Add(border);
        }
    }
}
