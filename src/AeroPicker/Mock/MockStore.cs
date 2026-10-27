using System.Collections.ObjectModel;
using System.IO;
using System.Text;
using System.Text.Json;
using AeroPicker.Mock.Models;

namespace AeroPicker.Mock;

public sealed class MockStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly string _root;
    private readonly string _licencePath;
    private readonly string _profilePath;
    private readonly string _tokenPath;
    private readonly string _applicationsPath;
    private AppScreen _return = AppScreen.JobDescription;

    public MockStore()
    {
        _root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "AeroPicker");
        Directory.CreateDirectory(_root);
        _licencePath = Path.Combine(_root, "licence.bin");
        _profilePath = Path.Combine(_root, "profile.json");
        _tokenPath = Path.Combine(_root, "token.bin");
        _applicationsPath = Path.Combine(_root, "applications.json");
        TechNames = new TechCatalog(_root);

        HasLicence = ReadLicence();
        Profile = ReadJson<Profile>(_profilePath) ?? new Profile();
        if (!Templates.Providers.Contains(Profile.Provider))
            Profile.Provider = Templates.Providers[0];
        HasToken = File.Exists(_tokenPath) && new FileInfo(_tokenPath).Length > 0;
        Applications = ReadJson<List<ApplicationRecord>>(_applicationsPath) ?? [];
        Screen = !HasLicence
            ? AppScreen.Licence
            : Profile.Completed && HasToken
                ? AppScreen.JobDescription
                : AppScreen.Wizard;
    }

    public TechCatalog TechNames { get; }

    public event Action? Changed;

    public AppScreen Screen { get; private set; }
    public int WizardStep { get; set; }
    public bool HasLicence { get; private set; }
    public bool HasToken { get; private set; }
    public Profile Profile { get; }
    public JobDraft Draft { get; private set; } = new();
    public List<ApplicationRecord> Applications { get; }
    public string? StatusMessage { get; private set; }
    public string LicencePath => _licencePath;
    public string DataDirectory => _root;

    public bool CanGenerate =>
        !string.IsNullOrWhiteSpace(Draft.Company)
        && !string.IsNullOrWhiteSpace(Draft.Role)
        && Draft.Skills.Any(skill => !string.IsNullOrWhiteSpace(skill));

    public bool CanCloseWizard => Profile.Completed && HasToken;

    public string? SaveLicence(string key)
    {
        var trimmed = key.Trim();
        if (trimmed.Length == 0)
            return "Paste a licence key first.";
        if (trimmed.Length > 4096)
            return "That key is too long.";

        var payload = Encoding.UTF8.GetBytes(trimmed);
        using var stream = new MemoryStream();
        using (var writer = new BinaryWriter(stream, Encoding.UTF8, leaveOpen: true))
        {
            writer.Write((byte)'A');
            writer.Write((byte)'P');
            writer.Write((byte)'L');
            writer.Write((byte)'1');
            writer.Write(1);
            writer.Write(payload.Length);
            writer.Write(payload);
        }

        File.WriteAllBytes(_licencePath, stream.ToArray());
        HasLicence = true;
        Screen = Profile.Completed && HasToken ? AppScreen.JobDescription : AppScreen.Wizard;
        WizardStep = 0;
        Changed?.Invoke();
        return null;
    }

    public void OpenWizard(int step)
    {
        if (Screen != AppScreen.Wizard)
            _return = Screen;
        WizardStep = step;
        Screen = AppScreen.Wizard;
        Changed?.Invoke();
    }

    public void CloseWizard()
    {
        if (!CanCloseWizard)
            return;

        SaveProfile();
        Screen = _return is AppScreen.Licence or AppScreen.Wizard
            ? AppScreen.JobDescription
            : _return;
        Changed?.Invoke();
    }

    public void SaveProfile() => WriteJson(_profilePath, Profile);

    public string? CompleteSetup(string? newToken)
    {
        var profileError = ProfileRules.ValidateForSave(Profile);
        if (profileError != null)
            return profileError;

        var token = newToken?.Trim() ?? "";
        if (token.Length == 0 && !HasToken)
            return "Insert an API token to continue.";
        if (token.Length > 4096)
            return "That token is too long.";

        if (token.Length > 0)
        {
            File.WriteAllBytes(_tokenPath, Encoding.UTF8.GetBytes(token));
            HasToken = true;
        }

        var returning = Profile.Completed;
        Profile.Completed = true;
        SaveProfile();
        StatusMessage = null;
        Screen = returning && _return is not AppScreen.Licence and not AppScreen.Wizard
            ? _return
            : AppScreen.JobDescription;
        Changed?.Invoke();
        return null;
    }

    public string? BeginReview()
    {
        if (string.IsNullOrWhiteSpace(Draft.Description))
            return "Paste a job description first.";

        var found = JobExtractor.Extract(Draft.Description, Profile.Skills);
        Draft.Company = found.Company;
        Draft.Role = found.Role;
        Draft.Location = found.Location;
        Draft.Seniority = found.Seniority;
        Draft.Skills = new ObservableCollection<string>(found.Skills);
        Draft.Skipped.Clear();
        Draft.Questions.Clear();
        StatusMessage = null;
        Screen = AppScreen.JobReview;
        Changed?.Invoke();
        return null;
    }

    public void Go(AppScreen screen)
    {
        Screen = screen;
        Changed?.Invoke();
    }

    public string? ExportFiles()
    {
        Draft.ResumeText = MockTailor.Resume(Profile, Draft);
        Draft.CoverLetterText = MockTailor.Cover(Profile, Draft);

        var stamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        var folder = Path.Combine(_root, "exports", $"{stamp}-{Slug(Draft.Company)}-{Slug(Draft.Role)}");
        Directory.CreateDirectory(folder);
        File.WriteAllText(Path.Combine(folder, "resume.txt"), Draft.ResumeText);
        File.WriteAllText(Path.Combine(folder, "cover-letter.txt"), Draft.CoverLetterText);
        Draft.ExportFolder = folder;
        Screen = AppScreen.Qa;
        Changed?.Invoke();
        return null;
    }

    public void FinishApplication()
    {
        if (string.IsNullOrWhiteSpace(Draft.ResumeText))
        {
            Draft.ResumeText = MockTailor.Resume(Profile, Draft);
            Draft.CoverLetterText = MockTailor.Cover(Profile, Draft);
        }

        var record = new ApplicationRecord
        {
            SavedAt = DateTimeOffset.Now,
            Company = Draft.Company.Trim(),
            Role = Draft.Role.Trim(),
            Location = Draft.Skipped.Contains("location") ? "" : Draft.Location.Trim(),
            Seniority = Draft.Skipped.Contains("seniority") ? "" : Draft.Seniority.Trim(),
            Skills = Draft.Skills.ToList(),
            JobDescription = Draft.Description,
            ResumeTemplate = Draft.ResumeTemplate,
            CoverTemplate = Draft.CoverTemplate,
            ResumeText = Draft.ResumeText,
            CoverLetterText = Draft.CoverLetterText,
            ExportFolder = Draft.ExportFolder,
            Questions = Draft.Questions
                .Select(pair => new QaPair { Question = pair.Question, Answer = pair.Answer })
                .ToList()
        };

        Applications.Insert(0, record);
        WriteJson(_applicationsPath, Applications);

        var saved = $"{record.Company} · {record.Role}";
        Draft = new JobDraft();
        StatusMessage = $"Saved {saved}.";
        Screen = AppScreen.JobDescription;
        Changed?.Invoke();
    }

    private bool ReadLicence()
    {
        if (!File.Exists(_licencePath))
            return false;

        var bytes = File.ReadAllBytes(_licencePath);
        if (bytes.Length < 12 || bytes[0] != (byte)'A' || bytes[1] != (byte)'P' || bytes[2] != (byte)'L' || bytes[3] != (byte)'1')
            return false;

        var version = BitConverter.ToInt32(bytes, 4);
        var length = BitConverter.ToInt32(bytes, 8);
        return version == 1 && length > 0 && bytes.Length >= 12 + length;
    }

    private static T? ReadJson<T>(string path)
    {
        if (!File.Exists(path))
            return default;

        try
        {
            return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions);
        }
        catch (JsonException)
        {
            return default;
        }
    }

    private static void WriteJson<T>(string path, T value) =>
        File.WriteAllText(path, JsonSerializer.Serialize(value, JsonOptions));

    private static string Slug(string value)
    {
        var chars = value.Trim().ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray();
        var slug = new string(chars);
        while (slug.Contains("--", StringComparison.Ordinal))
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        slug = slug.Trim('-');
        return slug.Length == 0 ? "untitled" : slug;
    }
}
