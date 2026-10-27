namespace AeroPicker.Mock.Models;

public sealed class ApplicationRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset SavedAt { get; set; }
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string Location { get; set; } = "";
    public string Seniority { get; set; } = "";
    public List<string> Skills { get; set; } = [];
    public string JobDescription { get; set; } = "";
    public string ResumeTemplate { get; set; } = "";
    public string CoverTemplate { get; set; } = "";
    public string ResumeText { get; set; } = "";
    public string CoverLetterText { get; set; } = "";
    public string ExportFolder { get; set; } = "";
    public List<QaPair> Questions { get; set; } = [];
}
