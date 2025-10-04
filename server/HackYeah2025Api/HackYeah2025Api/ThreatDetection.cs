namespace HackYeah2025Api;

public sealed record ThreatDetection(DateTime TimestampUtc, double Latitude, double Longitude, double Confidence, string SensorType, string DetectionSource, string Classification);
