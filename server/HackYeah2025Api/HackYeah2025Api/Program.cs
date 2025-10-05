using System.Globalization;
using Microsoft.AspNetCore.Mvc;

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

        app.MapGet("/raw-data", async (DatabricksClientFactory factory, [FromQuery(Name = "from")] string? from, CancellationToken ct) =>
            {
                var client = factory.Create();
                DateTimeOffset? fromUtc = null;
                if (!string.IsNullOrWhiteSpace(from))
                {
                    if (DateTimeOffset.TryParse(from, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dto))
                    {
                        fromUtc = dto.ToUniversalTime();
                    }
                }

                var rows = await client.QueryDetectionsAsync(fromUtc, ct);
                return Results.Ok(rows);
            })
            .WithName("GetRawThreats");

        app.MapGet("/summary", async (DatabricksClientFactory factory, [FromQuery(Name = "from")] string? from, CancellationToken ct) =>
            {
                var client = factory.Create();
                DateTimeOffset? fromUtc = null;
                if (!string.IsNullOrWhiteSpace(from))
                {
                    if (DateTimeOffset.TryParse(from, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dto))
                    {
                        fromUtc = dto.ToUniversalTime();
                    }
                }

                var rows = await client.QuerySummariesAsync(fromUtc, ct);
                return Results.Ok(rows);
            })
            .WithName("GetSummary");

        app.Run();
    }
}
