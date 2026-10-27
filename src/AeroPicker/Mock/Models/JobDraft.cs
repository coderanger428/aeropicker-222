using System.Collections.ObjectModel;

namespace AeroPicker.Mock.Models;

public sealed class JobDraft
{
    public string Description { get; set; } = "";
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string Location { get; set; } = "";
    public string Seniority { get; set; } = "";
    public ObservableCollection<string> Skills { get; set; } = [];
    public HashSet<string> Skipped { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string ResumeTemplate { get; set; } = Templates.Resumes[0];
    public string CoverTemplate { get; set; } = Templates.Letters[0];
    public string ResumeText { get; set; } = "";
    public string CoverLetterText { get; set; } = "";
    public string ExportFolder { get; set; } = "";
    public ObservableCollection<QaPair> Questions { get; set; } = [];
}

public sealed class QaPair
{
    public string Question { get; set; } = "";
    public string Answer { get; set; } = "";
}

public static class Templates
{
    public static readonly string[] Resumes = ["ATS Classic", "ATS Compact", "Modern"];
    public static readonly string[] Letters = ["Formal", "Brief"];
    public static readonly string[] Providers = ["OpenAI", "Azure OpenAI", "OpenAI-compatible"];
}
