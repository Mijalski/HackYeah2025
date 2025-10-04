using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace HackYeah2025Api;

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

    public async Task<IReadOnlyList<ThreatDetection>> QueryDetectionsAsync(DateTimeOffset? fromUtc, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri($"https://{_host}");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _token);

        var where = fromUtc.HasValue
            ? $" WHERE timestamp_utc >= TIMESTAMP '{fromUtc.Value.UtcDateTime:yyyy-MM-dd HH:mm:ss}'"
            : string.Empty;

        var body = new
        {
            statement = $"select timestamp_utc,latitude,longitude,confidence,sensor_type,detection_source,classification FROM de_ml_ws_3660604388778488.default.silver_data_layer{where}",
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
        if (!string.Equals(state, "SUCCEEDED", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Databricks SQL statement did not succeed: {state}");
        }

        return ParseDetectionRows(root);
    }

    public async Task<IReadOnlyList<ThreatSummary>> QuerySummariesAsync(DateTimeOffset? fromUtc, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri($"https://{_host}");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _token);

        var where = fromUtc.HasValue
            ? $" WHERE timestamp_utc >= TIMESTAMP '{fromUtc.Value.UtcDateTime:yyyy-MM-dd HH:mm:ss}'"
            : string.Empty;

        var body = new
        {
            statement = $"select incident_id,timestamp_utc,data_points,risk_level,summary from de_ml_ws.default.incident_summaries{where}",
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
        if (!string.Equals(state, "SUCCEEDED", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Databricks SQL statement did not succeed: {state}");
        }

        if (!root.TryGetProperty("result", out var result) || !result.TryGetProperty("data_array", out var data))
        {
            return Array.Empty<ThreatSummary>();
        }

        var list = new List<ThreatSummary>(data.GetArrayLength());
        foreach (var row in data.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var id = row[0].GetString() ?? string.Empty;

            DateTime timestampUtc = DateTime.MinValue;
            if (row[1].ValueKind == JsonValueKind.String && DateTime.TryParse(row[1].GetString(), out var t))
            {
                timestampUtc = t;
            }

            IEnumerable<Point> points = ParsePoints(row[2]);
            var description = row[4].GetString() ?? string.Empty;

            list.Add(new ThreatSummary(id, timestampUtc, points, int.Parse(row[3].GetString(), CultureInfo.InvariantCulture), description));
        }

        return list;
    }

    private static IEnumerable<Point> ParsePoints(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            var points = new List<Point>(element.GetArrayLength());
            foreach (var e in element.EnumerateArray())
            {
                if (e.TryGetProperty("lat", out var latEl) && e.TryGetProperty("lng", out var lngEl))
                {
                    if (latEl.TryGetDouble(out var lat) && lngEl.TryGetDouble(out var lng))
                    {
                        points.Add(new Point(lat, lng));
                    }
                }
            }

            return points;
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var s = element.GetString();
            if (!string.IsNullOrWhiteSpace(s))
            {
                try
                {
                    using var doc = JsonDocument.Parse(s);
                    return ParsePoints(doc.RootElement);
                }
                catch
                {
                }
            }
        }

        return Array.Empty<Point>();
    }

    private static IReadOnlyList<ThreatDetection> ParseDetectionRows(JsonElement root)
    {
        if (!root.TryGetProperty("result", out var result))
        {
            return Array.Empty<ThreatDetection>();
        }

        if (!result.TryGetProperty("data_array", out var data))
        {
            return Array.Empty<ThreatDetection>();
        }

        var list = new List<ThreatDetection>(data.GetArrayLength());
        foreach (var row in data.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            DateTime ts = DateTime.MinValue;
            if (row[0].ValueKind == JsonValueKind.String)
            {
                var s = row[0].GetString();
                if (!string.IsNullOrWhiteSpace(s))
                {
                    if (!DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out ts))
                    {
                        DateTime.TryParseExact(s, "dd.MM.yyyy HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out ts);
                    }
                }
            }

            var isLatOk = double.TryParse(row[1].GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lat);
            var isLonOk = double.TryParse(row[2].GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lon);
            var isConfOk = double.TryParse(row[3].GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var conf);
            var sensor = row[4].GetString() ?? string.Empty;
            var src = row[5].GetString() ?? string.Empty;
            var cls = row[6].GetString() ?? string.Empty;

            list.Add(new ThreatDetection(ts, lat, lon, conf, sensor, src, cls));
        }

        return list;
    }
}
