namespace HackYeah2025Api;

public sealed record ThreatSummary(string Id, DateTimeOffset TimestampStartUtc, DateTimeOffset TimestampEndUtc, IEnumerable<Point> Points, string RiskLevel);

public sealed record Point(double Latitude, double Longitude);