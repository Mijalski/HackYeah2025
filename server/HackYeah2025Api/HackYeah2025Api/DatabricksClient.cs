using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace HackYeah2025Api;

public sealed class DatabricksClient
{
    private static readonly string TimestampFormat = "yyyy-MM-dd HH:mm:ss";

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
            ? $" WHERE timestamp_utc >= TIMESTAMP '{fromUtc.Value.UtcDateTime.ToString(TimestampFormat, CultureInfo.InvariantCulture)}'"
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
            ? $" WHERE timestamp_start >= TIMESTAMP '{fromUtc.Value.UtcDateTime.ToString(TimestampFormat, CultureInfo.InvariantCulture)}'"
            : string.Empty;

        var body = new
        {
            statement = $"select incident_id,timestamp_start,timestamp_end,data_points,risk_level from de_ml_ws_3660604388778488.default.gold_layer_incidents{where}",
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
            var timestampStartUtc = ParseTimestampUtc(row[1]);
            var timestampEndUtc = ParseTimestampUtc(row[2]);
            var points = ParsePoints(row[3]);
            var riskLevel = row[4].GetString() ?? string.Empty;

            list.Add(new ThreatSummary(id, timestampStartUtc, timestampEndUtc, points, riskLevel));
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
                    var hasLat = latEl.ValueKind == JsonValueKind.Number ? latEl.TryGetDouble(out var latNum) : double.TryParse(latEl.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out latNum);
                    var hasLng = lngEl.ValueKind == JsonValueKind.Number ? lngEl.TryGetDouble(out var lngNum) : double.TryParse(lngEl.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out lngNum);
                    if (hasLat && hasLng)
                    {
                        points.Add(new Point(latNum, lngNum));
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

            var ts = ParseTimestampUtc(row[0]);
            var lat = ReadDouble(row[1]);
            var lon = ReadDouble(row[2]);
            var conf = ReadDouble(row[3]);
            var sensor = row[4].GetString() ?? string.Empty;
            var src = row[5].GetString() ?? string.Empty;
            var cls = row[6].GetString() ?? string.Empty;

            list.Add(new ThreatDetection(ts, lat, lon, conf, sensor, src, cls));
        }

        return list;
    }

    private static DateTime ParseTimestampUtc(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.String)
        {
            var s = el.GetString();
            return ParseTimestampUtc(s);
        }

        return DateTime.MinValue;
    }

    private static DateTime ParseTimestampUtc(string? s)
    {
        if (string.IsNullOrWhiteSpace(s))
        {
            return DateTime.MinValue;
        }

        if (DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dto))
        {
            return dto.UtcDateTime;
        }

        if (DateTime.TryParseExact(s, TimestampFormat, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
        {
            return dt.ToUniversalTime();
        }

        return DateTime.MinValue;
    }

    private static double ReadDouble(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Number && el.TryGetDouble(out var n))
        {
            return n;
        }

        var s = el.GetString();
        if (!string.IsNullOrWhiteSpace(s) && double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var x))
        {
            return x;
        }

        return 0d;
    }
}
