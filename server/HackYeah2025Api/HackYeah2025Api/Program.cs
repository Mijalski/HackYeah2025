using HackYeah2025Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

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