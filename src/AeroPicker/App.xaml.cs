using System.Windows;

namespace AeroPicker;

public partial class App : Application
{
    public App()
    {
        DispatcherUnhandledException += (_, args) =>
        {
            MessageBox.Show(args.Exception.ToString(), "AeroPicker");
            args.Handled = true;
        };
    }
}
