using System.Collections.ObjectModel;
using System.Text.Json.Serialization;

namespace AeroPicker.Mock.Models;

public sealed class Profile
{
    public bool Completed { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Location { get; set; } = "";
    public string LinkedIn { get; set; } = "";
    public string GitHub { get; set; } = "";
    public string X { get; set; } = "";
    public string Facebook { get; set; } = "";
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
    public string Company { get; set; } = "";
    public string Location { get; set; } = "";
    public string Start { get; set; } = "";
    public string End { get; set; } = "";
    public bool Current { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Employer
    {
        get => null;
        set
        {
            if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(Company))
                Company = value;
        }
    }
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

public static class ProfileRules
{
    public static string? ValidateStep(Profile profile, int step) => step switch
    {
        0 => ValidatePersonal(profile),
        1 => Invalid(profile.Career, entry =>
            string.IsNullOrWhiteSpace(entry.Company)
            || string.IsNullOrWhiteSpace(entry.Start)
            || (!entry.Current && string.IsNullOrWhiteSpace(entry.End)))
            ? "Each company needs a name and a start date. Add an end date, or mark it as current."
            : null,
        3 => Invalid(profile.Projects, entry =>
            string.IsNullOrWhiteSpace(entry.Name) || string.IsNullOrWhiteSpace(entry.Role))
            ? "Each project needs a name and your role."
            : null,
        4 => Invalid(profile.Education, entry =>
            string.IsNullOrWhiteSpace(entry.Institution) || string.IsNullOrWhiteSpace(entry.Credential))
            ? "Each education entry needs an institution and a credential."
            : null,
        5 => Invalid(profile.Credentials, entry => string.IsNullOrWhiteSpace(entry.Name))
            ? "Each certificate or achievement needs a name."
            : null,
        _ => null
    };

    public static string? ValidateForSave(Profile profile)
    {
        for (var step = 0; step <= 5; step++)
        {
            var error = ValidateStep(profile, step);
            if (error != null)
                return error;
        }

        return null;
    }

    private static string? ValidatePersonal(Profile profile)
    {
        if (string.IsNullOrWhiteSpace(profile.FullName))
            return "Enter your name to continue.";
        if (string.IsNullOrWhiteSpace(profile.Email))
            return "Enter your email to continue.";
        if (string.IsNullOrWhiteSpace(profile.Phone))
            return "Enter your phone number to continue.";
        if (string.IsNullOrWhiteSpace(profile.Location))
            return "Enter your location to continue.";
        if (string.IsNullOrWhiteSpace(profile.LinkedIn))
            return "Enter your LinkedIn link to continue.";
        return null;
    }

    private static bool Invalid<T>(IEnumerable<T> entries, Func<T, bool> invalid) => entries.Any(invalid);
}
