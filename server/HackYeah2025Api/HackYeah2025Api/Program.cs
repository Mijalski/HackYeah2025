namespace HackYeah2025Api;

public static class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddHttpClient();
        builder.Services.AddTransient<DatabricksClientFactory>();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowHackYeahClients", policy =>
            {
                policy.WithOrigins(
                        "https://hackyeah2025.netlify.app",
                        "http://localhost:3000",
                        "http://localhost:4200",
                        "http://localhost:5173",
                        "http://localhost:5000",
                        "https://localhost:3000",
                        "https://localhost:4200",
                        "https://localhost:5173",
                        "https://localhost:5000"
                    )
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

        var app = builder.Build();

        app.UseHttpsRedirection();
        app.UseCors("AllowHackYeahClients");

        app.MapGet("/raw-data", async (DatabricksClientFactory factory, CancellationToken ct) =>
            {
                var client = factory.Create();
                var rows = await client.QueryDetectionsAsync(ct);
                return Results.Ok(rows);
            })
            .WithName("GetRawThreats");

        app.MapGet("/summary", async (DatabricksClientFactory factory, CancellationToken ct) =>
        {
            var summaries = new List<ThreatSummary>
            {
                new(
                    DateTime.UtcNow,
                    new List<Point>
                    {
                        new(53.1325, 23.1688),
                        new(53.1330, 23.1695),
                        new(53.1320, 23.1680)
                    },
                    2,
                    "Suspicious network activity detected near Bia³ystok"
                ),
                new(
                    DateTime.UtcNow.AddMinutes(-10),
                    new List<Point>
                    {
                        new(52.2297, 21.0122),
                        new(52.2300, 21.0130),
                        new(52.2294, 21.0115)
                    },
                    4,
                    "Potential coordinated threat detected in Warsaw"
                )
            };

            return Results.Ok(summaries);
        })
            .WithName("GetSummary");

        app.Run();
    }
}
