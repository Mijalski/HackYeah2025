namespace HackYeah2025Api;

public static class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddHttpClient();

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

        app.MapGet("/raw-data", async (IHttpClientFactory httpClientFactory, CancellationToken ct) =>
        {
            var host = Environment.GetEnvironmentVariable("DATABRICKS_HOST");
            var warehouseId = Environment.GetEnvironmentVariable("DATABRICKS_WAREHOUSE_ID");
            var token = Environment.GetEnvironmentVariable("DATABRICKS_TOKEN");

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(warehouseId) || string.IsNullOrWhiteSpace(token))
            {
                return Results.Problem("Missing DATABRICKS_HOST, DATABRICKS_WAREHOUSE_ID, or DATABRICKS_TOKEN.");
            }

            var client = new DatabricksClient(httpClientFactory, host, warehouseId, token);
            var rows = await client.QueryDetectionsAsync(ct);
            return Results.Ok(rows);
        })
            .WithName("GetRawThreats");

        app.Run();
    }
}
