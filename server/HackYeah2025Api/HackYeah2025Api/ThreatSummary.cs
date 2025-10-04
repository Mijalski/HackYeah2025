namespace HackYeah2025Api;

public sealed record ThreatSummary(string Id, DateTime TimestampUtc, IEnumerable<Point> Points, int Severity, string Description, double Area);

public sealed record Point(double Latitude, double Longitude);