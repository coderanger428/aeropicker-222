using System.Globalization;
using System.Windows.Data;

namespace AeroPicker.Views;

public sealed class EndDateRequirementConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is true ? FieldRequirement.Optional : FieldRequirement.Required;

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is FieldRequirement.Optional;
}

public sealed class InverseBooleanConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is not true;

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is not true;
}
