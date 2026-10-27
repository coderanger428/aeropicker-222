namespace AeroPicker.Mock;

public sealed record ExtractedJob(
    string Company,
    string Role,
    string Location,
    string Seniority,
    IReadOnlyList<string> Skills);

public static class JobExtractor
{
    private static readonly string[] CompanyLabels = ["company", "organisation", "organization", "employer"];
    private static readonly string[] RoleLabels = ["role", "position", "job title", "title"];
    private static readonly string[] LocationLabels = ["location", "where"];
    private static readonly string[] SeniorityLabels = ["seniority", "level"];

    public static ExtractedJob Extract(string description, IEnumerable<string> masterSkills)
    {
        var company = "";
        var role = "";
        var location = "";
        var seniority = "";
        var skills = new List<string>();
        var inSkills = false;

        foreach (var raw in description.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.Trim();
            if (line.Length == 0)
                continue;

            if (TryLabel(line, CompanyLabels, out var value))
            {
                company = value;
                inSkills = false;
                continue;
            }

            if (TryLabel(line, RoleLabels, out value))
            {
                role = value;
                inSkills = false;
                continue;
            }

            if (TryLabel(line, LocationLabels, out value))
            {
                location = value;
                inSkills = false;
                continue;
            }

            if (TryLabel(line, SeniorityLabels, out value))
            {
                seniority = value;
                inSkills = false;
                continue;
            }

            if (IsSkillHeading(line))
            {
                inSkills = true;
                continue;
            }

            if (inSkills && TryBullet(line, out var bullet))
            {
                AddSkill(skills, bullet);
                continue;
            }

            if (inSkills)
                inSkills = false;
        }

        foreach (var skill in masterSkills)
        {
            if (Mentioned(description, skill))
                AddSkill(skills, skill);
        }

        return new ExtractedJob(company, role, location, seniority, skills);
    }

    private static bool TryLabel(string line, string[] labels, out string value)
    {
        foreach (var label in labels.OrderByDescending(label => label.Length))
        {
            if (!line.StartsWith(label, StringComparison.OrdinalIgnoreCase))
                continue;

            var rest = line[label.Length..].TrimStart();
            if (rest.Length == 0 || (rest[0] != ':' && rest[0] != '-' && rest[0] != '–'))
                continue;

            value = rest[1..].Trim();
            if (value.Length > 0)
                return true;
        }

        value = "";
        return false;
    }

    private static bool IsSkillHeading(string line)
    {
        if (line.StartsWith("- ") || line.StartsWith("* ") || line.StartsWith('•'))
            return false;

        var text = line.TrimEnd(':').Trim().ToLowerInvariant();
        return text is "requirements" or "required skills" or "skills" or "qualifications" or "must have"
            || text.Contains("requirement", StringComparison.Ordinal)
            || text.Contains("qualification", StringComparison.Ordinal);
    }

    private static bool TryBullet(string line, out string bullet)
    {
        if (line.StartsWith("- ") || line.StartsWith("* ") || line.StartsWith("• "))
            bullet = line[2..].Trim();
        else if (line.StartsWith('•'))
            bullet = line[1..].Trim();
        else
        {
            bullet = "";
            return false;
        }

        return bullet.Length is > 0 and <= 120;
    }

    private static bool Mentioned(string haystack, string skill)
    {
        var needle = skill.Trim();
        if (needle.Length < 2)
            return false;

        if (needle.Length <= 2)
        {
            return haystack
                .Split([' ', '\n', '\r', '\t', ',', '/', '(', ')', ':'], StringSplitOptions.RemoveEmptyEntries)
                .Any(token => token.Equals(needle, StringComparison.OrdinalIgnoreCase));
        }

        return haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);
    }

    private static void AddSkill(List<string> skills, string skill)
    {
        var cleaned = skill.Trim();
        if (cleaned.Length == 0 || skills.Count >= 40)
            return;

        if (skills.Any(existing =>
            existing.Equals(cleaned, StringComparison.OrdinalIgnoreCase)
            || (existing.Contains(cleaned, StringComparison.OrdinalIgnoreCase) && existing.Length > cleaned.Length)))
            return;

        skills.RemoveAll(existing =>
            cleaned.Contains(existing, StringComparison.OrdinalIgnoreCase) && cleaned.Length > existing.Length);
        skills.Add(cleaned);
    }
}
