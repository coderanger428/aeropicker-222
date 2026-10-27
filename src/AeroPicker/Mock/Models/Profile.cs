using System.Collections.ObjectModel;

namespace AeroPicker.Mock.Models;

public sealed class Profile
{
    public bool Completed { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Location { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Provider { get; set; } = "OpenAI";
    public ObservableCollection<CareerEntry> Career { get; set; } = [];
    public ObservableCollection<string> Skills { get; set; } = [];
    public ObservableCollection<ProjectEntry> Projects { get; set; } = [];
    public ObservableCollection<EducationEntry> Education { get; set; } = [];
    public ObservableCollection<CredentialEntry> Credentials { get; set; } = [];
}

public sealed class CareerEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = "";
    public string Employer { get; set; } = "";
    public string Start { get; set; } = "";
    public string End { get; set; } = "";
    public bool Current { get; set; }
    public string Highlights { get; set; } = "";
}

public sealed class ProjectEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
    public string Details { get; set; } = "";
}

public sealed class EducationEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Institution { get; set; } = "";
    public string Credential { get; set; } = "";
    public string Year { get; set; } = "";
}

public sealed class CredentialEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Kind { get; set; } = "Certificate";
    public string Name { get; set; } = "";
    public string Issuer { get; set; } = "";
    public string Year { get; set; } = "";
}
