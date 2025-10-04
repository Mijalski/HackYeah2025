namespace HackYeah2025Api;

public sealed class DatabricksClientFactory
{
    private readonly IHttpClientFactory _httpClientFactory;

    public DatabricksClientFactory(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
    }

    public DatabricksClient Create()
    {
        var host = Environment.GetEnvironmentVariable("DATABRICKS_HOST");
        var warehouseId = Environment.GetEnvironmentVariable("DATABRICKS_WAREHOUSE_ID");
        var token = Environment.GetEnvironmentVariable("DATABRICKS_TOKEN");

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(warehouseId) || string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Missing DATABRICKS_HOST, DATABRICKS_WAREHOUSE_ID, or DATABRICKS_TOKEN.");
        }

        return new DatabricksClient(_httpClientFactory, host, warehouseId, token);
    }
}
