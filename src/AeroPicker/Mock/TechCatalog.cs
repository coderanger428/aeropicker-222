using System.IO;
using System.Text.Json;

namespace AeroPicker.Mock;

public sealed class TechCatalog
{
    private static readonly string[] BuiltIn =
    [
        "C", "C++", "C#", "CSS", "Dart", "Elixir", "Go", "HTML", "Java", "JavaScript", "Kotlin", "PHP", "Python", "R",
        "Ruby", "Rust", "Scala", "SQL", "Swift", "TypeScript", "Bash",
        "Angular", "Astro", "Bootstrap", "esbuild", "Gatsby", "jQuery", "Less", "Material UI", "MobX", "Next.js", "Nuxt",
        "Qwik", "React", "Redux", "Remix", "RxJS", "Sass", "SolidJS", "Svelte", "SvelteKit", "Tailwind CSS",
        "TanStack Query", "Three.js", "Vite", "Vue", "Webpack", "Zustand",
        ".NET", "Actix", "ASP.NET Core", "Blazor", "Bun", "Deno", "Django", "Express", "FastAPI", "Fastify", "Fiber",
        "Flask", "Gin", "Hono", "Ktor", "Laravel", "NestJS", "Node.js", "Phoenix", "Ruby on Rails", "Spring Boot", "Symfony",
        "GraphQL", "gRPC", "JSON", "JWT", "OAuth", "OpenAPI", "REST", "tRPC", "WebSocket",
        "Android", "Expo", "Flutter", "Ionic", "iOS", "Jetpack Compose", ".NET MAUI", "Objective-C", "React Native",
        "SwiftUI", "UIKit",
        "Amazon CloudFront", "Amazon EC2", "Amazon ECS", "Amazon EKS", "Amazon RDS", "Amazon S3", "AWS", "AWS CDK",
        "AWS Lambda", "Azure", "Azure DevOps", "Azure Functions", "Cloud Functions", "Cloudflare", "Cloud Run",
        "DigitalOcean", "Firebase", "Firestore", "Google Cloud", "Heroku", "Netlify", "Supabase", "Vercel",
        "Ansible", "Argo CD", "CI/CD", "CircleCI", "Docker", "Docker Compose", "Git", "GitHub", "GitHub Actions",
        "GitLab", "GitLab CI", "Grafana", "Helm", "Jenkins", "Kubernetes", "Linux", "Nginx", "Prometheus", "Pulumi",
        "Terraform",
        "BigQuery", "Cassandra", "Cosmos DB", "Drizzle", "DynamoDB", "Elasticsearch", "Entity Framework", "MariaDB",
        "MongoDB", "Mongoose", "MySQL", "Neo4j", "OpenSearch", "Oracle Database", "PostgreSQL", "Prisma", "Redis",
        "Sequelize", "Snowflake", "SQL Server", "SQLite",
        "Apache Airflow", "Apache Kafka", "Apache Spark", "dbt", "Hadoop", "RabbitMQ",
        "CUDA", "Deep Learning", "Hugging Face", "Jupyter", "Keras", "LangChain", "LLM", "Machine Learning", "MLflow",
        "NumPy", "ONNX", "OpenAI", "OpenCV", "Pandas", "PyTorch", "RAG", "scikit-learn", "spaCy", "TensorFlow",
        "Transformers",
        "Cypress", "Jest", "JUnit", "Mocha", "NUnit", "Playwright", "pytest", "Selenium", "Vitest", "xUnit",
        "Electron", "Microservices", "Postman", "Serverless", "Tauri", "WinUI", "WPF"
    ];

    private readonly string _path;
    private readonly List<string> _custom = [];

    public TechCatalog(string directory)
    {
        _path = Path.Combine(directory, "tech-names.json");
        if (!File.Exists(_path))
            return;

        try
        {
            var saved = JsonSerializer.Deserialize<List<string>>(File.ReadAllText(_path)) ?? [];
            foreach (var name in saved)
            {
                var trimmed = name.Trim();
                if (trimmed.Length == 0 || Contains(trimmed))
                    continue;
                _custom.Add(trimmed);
            }
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
        {
        }
    }

    public IReadOnlyList<string> Suggest(string query, int limit = 8)
    {
        var needle = query.Trim();
        if (needle.Length == 0)
            return [];

        return Names()
            .Select(name => (name, score: Score(name, needle)))
            .Where(item => item.score > 0)
            .OrderByDescending(item => item.score)
            .ThenBy(item => item.name, StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .Select(item => item.name)
            .ToList();
    }

    public string Resolve(string typed)
    {
        var trimmed = typed.Trim();
        if (trimmed.Length == 0 || trimmed.Length > 80)
            return "";

        var match = Names().FirstOrDefault(name => name.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
        if (match != null)
            return match;

        _custom.Add(trimmed);
        Save();
        return trimmed;
    }

    private IEnumerable<string> Names()
    {
        foreach (var name in BuiltIn)
            yield return name;
        foreach (var name in _custom)
            yield return name;
    }

    private bool Contains(string name) =>
        Names().Any(existing => existing.Equals(name, StringComparison.OrdinalIgnoreCase));

    private static int Score(string name, string query)
    {
        if (name.Equals(query, StringComparison.OrdinalIgnoreCase))
            return 3;
        if (name.StartsWith(query, StringComparison.OrdinalIgnoreCase))
            return 2;
        if (name.Contains(query, StringComparison.OrdinalIgnoreCase))
            return 1;
        return 0;
    }

    private void Save()
    {
        try
        {
            File.WriteAllText(_path, JsonSerializer.Serialize(_custom));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
        }
    }
}
