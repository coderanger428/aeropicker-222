using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace AeroPicker.Views;

public enum FieldRequirement
{
    Required,
    Optional
}

public sealed class FieldCaption : DockPanel
{
    public static readonly DependencyProperty TextProperty = DependencyProperty.Register(
        nameof(Text),
        typeof(string),
        typeof(FieldCaption),
        new PropertyMetadata("", (d, _) => ((FieldCaption)d).Update()));

    public static readonly DependencyProperty RequirementProperty = DependencyProperty.Register(
        nameof(Requirement),
        typeof(FieldRequirement),
        typeof(FieldCaption),
        new PropertyMetadata(FieldRequirement.Required, (d, _) => ((FieldCaption)d).Update()));

    public static readonly DependencyProperty ValueProperty = DependencyProperty.Register(
        nameof(Value),
        typeof(object),
        typeof(FieldCaption),
        new PropertyMetadata(null, (d, _) => ((FieldCaption)d).Update()));

    public static readonly DependencyProperty IsFilledProperty = DependencyProperty.Register(
        nameof(IsFilled),
        typeof(bool),
        typeof(FieldCaption),
        new PropertyMetadata(false, (d, _) => ((FieldCaption)d).Update()));

    public static readonly DependencyProperty IsSkippedProperty = DependencyProperty.Register(
        nameof(IsSkipped),
        typeof(bool),
        typeof(FieldCaption),
        new PropertyMetadata(false, (d, _) => ((FieldCaption)d).Update()));

    private readonly TextBlock _label = new()
    {
        FontWeight = FontWeights.SemiBold,
        VerticalAlignment = VerticalAlignment.Center
    };

    private readonly TextBlock _pillText = new() { FontSize = 12 };
    private readonly Border _pill = new()
    {
        CornerRadius = new CornerRadius(10),
        Padding = new Thickness(8, 2, 8, 2),
        Margin = new Thickness(12, 0, 0, 0),
        VerticalAlignment = VerticalAlignment.Center
    };

    public FieldCaption()
    {
        Margin = new Thickness(0, 14, 0, 6);
        LastChildFill = true;
        _pill.Child = _pillText;
        SetDock(_pill, Dock.Right);
        Children.Add(_pill);
        Children.Add(_label);
        Update();
    }

    public string Text
    {
        get => (string)GetValue(TextProperty);
        set => SetValue(TextProperty, value);
    }

    public FieldRequirement Requirement
    {
        get => (FieldRequirement)GetValue(RequirementProperty);
        set => SetValue(RequirementProperty, value);
    }

    public object? Value
    {
        get => GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    public bool IsFilled
    {
        get => (bool)GetValue(IsFilledProperty);
        set => SetValue(IsFilledProperty, value);
    }

    public bool IsSkipped
    {
        get => (bool)GetValue(IsSkippedProperty);
        set => SetValue(IsSkippedProperty, value);
    }

    private void Update()
    {
        _label.Text = Text;

        string caption;
        Color background;
        Color foreground;
        if (IsSkipped)
        {
            caption = "Skipped";
            background = Color.FromRgb(0xF6, 0xF1, 0xE8);
            foreground = Color.FromRgb(0x6D, 0x65, 0x5C);
        }
        else if (HasContent())
        {
            caption = Requirement == FieldRequirement.Required ? "Required" : "Optional";
            background = Color.FromRgb(0xE7, 0xF0, 0xEA);
            foreground = Color.FromRgb(0x1E, 0x4D, 0x3A);
        }
        else if (Requirement == FieldRequirement.Required)
        {
            caption = "Required";
            background = Color.FromRgb(0xF8, 0xEC, 0xE3);
            foreground = Color.FromRgb(0x8A, 0x3D, 0x12);
        }
        else
        {
            caption = "Optional";
            background = Color.FromRgb(0xF6, 0xF1, 0xE8);
            foreground = Color.FromRgb(0x6D, 0x65, 0x5C);
        }

        _pillText.Text = caption;
        _pillText.Foreground = new SolidColorBrush(foreground);
        _pill.Background = new SolidColorBrush(background);
    }

    private bool HasContent()
    {
        if (IsFilled)
            return true;

        return Value switch
        {
            null => false,
            string text => !string.IsNullOrWhiteSpace(text),
            _ => true
        };
    }
}
