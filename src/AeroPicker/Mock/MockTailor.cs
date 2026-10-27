using System.Text;
using AeroPicker.Mock.Models;

namespace AeroPicker.Mock;

public static class MockTailor
{
    public static string Resume(Profile profile, JobDraft job)
    {
        var compact = job.ResumeTemplate == "ATS Compact";
        var blank = compact ? "\n" : "\n\n";
        var builder = new StringBuilder();

        builder.AppendLine(string.IsNullOrWhiteSpace(profile.FullName) ? "Name not set" : profile.FullName.Trim());

        var contact = Join(" · ", profile.Email, profile.Phone, profile.Location);
        if (contact.Length > 0)
            builder.AppendLine(contact);

        var target = Join(" · ", job.Role, job.Company);
        if (target.Length > 0)
            builder.AppendLine(target);

        if (!string.IsNullOrWhiteSpace(profile.Summary))
            AppendSection(builder, "Summary", profile.Summary.Trim(), blank);

        if (job.Skills.Count > 0)
        {
            var skills = compact ? string.Join(", ", job.Skills) : string.Join(" · ", job.Skills);
            AppendSection(builder, "Skills", skills, blank);
        }

        AppendEntries(builder, "Experience", blank, profile.Career
            .Where(entry => HasText(entry.Title) || HasText(entry.Employer))
            .Select(entry => CareerBlock(entry)));

        AppendEntries(builder, "Projects", blank, profile.Projects
            .Where(entry => HasText(entry.Name))
            .Select(entry => ProjectBlock(entry)));

        AppendEntries(builder, "Education", blank, profile.Education
            .Where(entry => HasText(entry.Institution) || HasText(entry.Credential))
            .Select(entry => Join(" — ", Join(", ", entry.Credential, entry.Institution), entry.Year)));

        AppendEntries(builder, "Certificates and achievements", blank, profile.Credentials
            .Where(entry => HasText(entry.Name))
            .Select(entry => Join(" — ", Join(": ", entry.Kind, entry.Name), Join(", ", entry.Issuer, entry.Year))));

        return builder.ToString().Trim() + Environment.NewLine;
    }

    public static string Cover(Profile profile, JobDraft job)
    {
        var name = string.IsNullOrWhiteSpace(profile.FullName) ? "Applicant" : profile.FullName.Trim();
        var company = string.IsNullOrWhiteSpace(job.Company) ? "your team" : job.Company.Trim();
        var role = string.IsNullOrWhiteSpace(job.Role) ? "the open role" : job.Role.Trim();
        var skills = job.Skills.Count == 0 ? "the work already listed in my resume" : string.Join(", ", job.Skills.Take(4));
        var latest = profile.Career.FirstOrDefault(entry => HasText(entry.Title) || HasText(entry.Employer));
        var highlight = latest is null ? "" : Lines(latest.Highlights).FirstOrDefault() ?? "";

        var experience = latest is null
            ? "My master resume does not list a past role yet, so this letter stays limited to the facts above."
            : HasText(highlight)
                ? $"At {latest.Employer}, as {latest.Title}, I can cite this from my resume: {highlight.TrimEnd('.')}."
                : $"I most recently worked as {latest.Title} at {latest.Employer}.";

        if (job.CoverTemplate == "Brief")
        {
            return $"""
                Dear {company} hiring team,

                I am applying for the {role} position. {experience} The relevant skills from my master resume are {skills}.

                {name}
                """ + Environment.NewLine;
        }

        var summary = string.IsNullOrWhiteSpace(profile.Summary)
            ? "I have kept this letter to experience that is already in my master resume."
            : profile.Summary.Trim();

        return $"""
            Dear {company} hiring team,

            I am applying for the {role} position. {summary}

            {experience}

            For this role I would draw on {skills}. I have not added experience that is absent from my master resume.

            Thank you for your time.
            {name}
            """ + Environment.NewLine;
    }

    public static string Answer(Profile profile, JobDraft job, string question)
    {
        var skill = job.Skills.FirstOrDefault(item => question.Contains(item, StringComparison.OrdinalIgnoreCase))
            ?? job.Skills.FirstOrDefault()
            ?? profile.Skills.FirstOrDefault(HasText)
            ?? "the work listed in my resume";

        var latest = profile.Career.FirstOrDefault(entry => HasText(entry.Title) || HasText(entry.Employer));
        var highlight = latest is null ? "" : Lines(latest.Highlights).FirstOrDefault() ?? "";
        var role = string.IsNullOrWhiteSpace(job.Role) ? "this" : job.Role.Trim();
        var company = string.IsNullOrWhiteSpace(job.Company) ? "the company" : job.Company.Trim();

        var opening = latest is null
            ? $"I would answer from the master resume only. The closest skill I can point to is {skill}."
            : HasText(highlight)
                ? $"At {latest.Employer}, as {latest.Title}, I can cite this from my resume: {highlight.TrimEnd('.')}. That work used {skill}."
                : $"As {latest.Title} at {latest.Employer}, I used {skill}.";

        return $"{opening} For the {role} application at {company}, I would stop at that fact rather than describe work I have not done.";
    }

    private static void AppendSection(StringBuilder builder, string title, string body, string blank)
    {
        builder.Append(blank);
        builder.AppendLine(title.ToUpperInvariant());
        builder.AppendLine(body);
    }

    private static void AppendEntries(StringBuilder builder, string title, string blank, IEnumerable<string> blocks)
    {
        var body = string.Join(Environment.NewLine + Environment.NewLine, blocks.Where(HasText));
        if (body.Length > 0)
            AppendSection(builder, title, body, blank);
    }

    private static string CareerBlock(CareerEntry entry)
    {
        var dates = entry.Current
            ? Join(" – ", entry.Start, "Present")
            : Join(" – ", entry.Start, entry.End);
        var lines = new List<string>
        {
            Join(" — ", entry.Title, entry.Employer)
        };

        if (HasText(dates))
            lines.Add(dates);

        lines.AddRange(Lines(entry.Highlights).Select(line => $"- {line}"));
        return string.Join(Environment.NewLine, lines.Where(HasText));
    }

    private static string ProjectBlock(ProjectEntry entry)
    {
        var lines = new List<string> { Join(" — ", entry.Name, entry.Role) };
        lines.AddRange(Lines(entry.Details));
        return string.Join(Environment.NewLine, lines.Where(HasText));
    }

    private static IEnumerable<string> Lines(string? text)
    {
        foreach (var raw in (text ?? "").Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.Trim();
            if (line.StartsWith("- ") || line.StartsWith("* ") || line.StartsWith("• "))
                line = line[2..].Trim();
            if (line.Length > 0)
                yield return line;
        }
    }

    private static string Join(string separator, params string?[] parts) =>
        string.Join(separator, parts.Where(HasText).Select(part => part!.Trim()));

    private static bool HasText(string? value) => !string.IsNullOrWhiteSpace(value);
}
