using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace HackYeah2025Api;

public sealed record ThreatDetecion(DateTime TimestampUtc, double Latitude, double Longitude, double Confidence, string SensorType, string DetectionSource, string Classification);

public sealed class DatabricksClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _host;
    private readonly string _warehouseId;
    private readonly string _token;

    public DatabricksClient(IHttpClientFactory httpClientFactory, string host, string warehouseId, string token)
    {
        _httpClientFactory = httpClientFactory;
        _host = host;
        _warehouseId = warehouseId;
        _token = token;
    }

    public async Task<IReadOnlyList<ThreatDetecion>> QueryDetectionsAsync(CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri($"https://{_host}");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _token);

        var body = new
        {
            statement = "select timestamp_utc,latitude,longitude,confidence,sensor_type,detection_source,classification from de_ml_ws.default.silver_drone_detections",
            warehouse_id = _warehouseId,
            wait_timeout = "15s",
            disposition = "INLINE"
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/2.0/sql/statements")
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };

        using var resp = await client.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Databricks SQL error: {(int)resp.StatusCode}");
        }

        using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var root = doc.RootElement;

        var state = root.GetProperty("status").GetProperty("state").GetString();
        var statementId = root.GetProperty("statement_id").GetString() ?? string.Empty;
        if (string.Equals(state, "SUCCEEDED", StringComparison.OrdinalIgnoreCase))
        {
            return ParseRows(root);
        }

        while (!string.Equals(state, "SUCCEEDED", StringComparison.OrdinalIgnoreCase))
        {
            if (string.Equals(state, "FAILED", StringComparison.OrdinalIgnoreCase) || string.Equals(state, "CANCELED", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Databricks SQL statement did not succeed: {state}");
            }

            await Task.Delay(TimeSpan.FromSeconds(1), ct);

            using var getResp = await client.GetAsync($"/api/2.0/sql/statements/{statementId}", ct);
            if (!getResp.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Databricks SQL poll error: {(int)getResp.StatusCode}");
            }

            using var getDoc = await JsonDocument.ParseAsync(await getResp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var getRoot = getDoc.RootElement;
            state = getRoot.GetProperty("status").GetProperty("state").GetString();
            if (string.Equals(state, "SUCCEEDED", StringComparison.OrdinalIgnoreCase))
            {
                return ParseRows(getRoot);
            }
        }

        return Array.Empty<ThreatDetecion>();
    }

    private static IReadOnlyList<ThreatDetecion> ParseRows(JsonElement root)
    {
        if (!root.TryGetProperty("result", out var result))
        {
            return Array.Empty<ThreatDetecion>();
        }

        if (!result.TryGetProperty("data_array", out var data))
        {
            return Array.Empty<ThreatDetecion>();
        }

        var list = new List<ThreatDetecion>(data.GetArrayLength());
        foreach (var row in data.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var ts = row[0].GetDateTime();
            var isLatOk = double.TryParse(row[1].GetString(), out var lat);
            var isLonOk = double.TryParse(row[2].GetString(), out var lon);
            var isConfOk = double.TryParse(row[3].GetString(), out var conf);
            var sensor = row[4].GetString() ?? string.Empty;
            var src = row[5].GetString() ?? string.Empty;
            var cls = row[6].GetString() ?? string.Empty;

            list.Add(new ThreatDetecion(ts, lat, lon, conf, sensor, src, cls));
        }

        return list;
    }
}