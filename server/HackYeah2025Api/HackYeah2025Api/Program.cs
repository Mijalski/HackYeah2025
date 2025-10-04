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

        app.MapGet("/raw-data", async (DatabricksClientFactory factory, CancellationToken ct) =>
            {
                var client = factory.Create();
                var rows = await client.QueryDetectionsAsync(ct);
                return Results.Ok(rows);
            })
            .WithName("GetRawThreats");

        app.MapGet("/summary", async (DatabricksClientFactory factory, CancellationToken ct) =>
            {
                var client = factory.Create();
                var rows = await client.QueryDetectionsAsync(ct);
                return Results.Ok(rows);
            })
            .WithName("GetSummary");

        app.MapGet("/summary-mock", async (DatabricksClientFactory factory, CancellationToken ct) =>
        {
            var summaries = new List<ThreatSummary>
            {
                new(
                    "abc",
                    DateTime.UtcNow,
                    new List<Point>
                    {
                        new(53.1325, 23.1688),
                        new(53.1330, 23.1695),
                        new(53.1320, 23.1680),
                        new(53.1315, 23.1702),
                        new(53.1340, 23.1710)
                    },
                    2,
                    "Suspicious network activity detected near Bia³ystok"
                ),
                new(
                    "abc1",
                    DateTime.UtcNow.AddMinutes(-10),
                    new List<Point>
                    {
                        new(52.2297, 21.0122),
                        new(52.2300, 21.0130),
                        new(52.2294, 21.0115),
                        new(52.2285, 21.0140),
                        new(52.2310, 21.0100)
                    },
                    4,
                    "Potential coordinated threat detected in Warsaw"
                ),
                new(
                    "xyz",
                    DateTime.UtcNow.AddMinutes(-25),
                    new List<Point>
                    {
                        new(50.0614, 19.9372),
                        new(50.0630, 19.9400),
                        new(50.0590, 19.9350),
                        new(50.0605, 19.9425),
                        new(50.0620, 19.9310)
                    },
                    3,
                    "Malware communication pattern detected in Kraków"
                ),
                new(
                    "asdas",
                    DateTime.UtcNow.AddMinutes(-40),
                    new List<Point>
                    {
                        new(51.1079, 17.0385),
                        new(51.1090, 17.0450),
                        new(51.1065, 17.0300),
                        new(51.1102, 17.0432),
                        new(51.1050, 17.0280)
                    },
                    5,
                    "Anomalous login attempts originating from Wroc³aw"
                ),
                new(
                    "eeee",
                    DateTime.UtcNow.AddMinutes(-55),
                    new List<Point>
                    {
                        new(54.3520, 18.6466),
                        new(54.3535, 18.6500),
                        new(54.3510, 18.6430),
                        new(54.3505, 18.6415),
                        new(54.3550, 18.6525)
                    },
                    3,
                    "Potential data exfiltration detected in Gdañsk"
                ),
                new(
                    "rrrr",
                    DateTime.UtcNow.AddMinutes(-70),
                    new List<Point>
                    {
                        new(49.8397, 24.0297),
                        new(49.8410, 24.0350),
                        new(49.8380, 24.0250),
                        new(49.8405, 24.0385),
                        new(49.8370, 24.0205)
                    },
                    6,
                    "Cross-border intrusion attempts near Lviv"
                ),
                new(
                    "bbb",
                    DateTime.UtcNow.AddMinutes(-90),
                    new List<Point>
                    {
                        new(52.4064, 16.9252),
                        new(52.4100, 16.9300),
                        new(52.4040, 16.9200),
                        new(52.4075, 16.9330),
                        new(52.4025, 16.9180)
                    },
                    2,
                    "DDoS probing patterns observed in Poznañ"
                ),
                new(
                    "bb2b",
                    DateTime.UtcNow.AddMinutes(-110),
                    new List<Point>
                    {
                        new(50.2649, 19.0238),
                        new(50.2655, 19.0300),
                        new(50.2630, 19.0180),
                        new(50.2665, 19.0340),
                        new(50.2615, 19.0150)
                    },
                    4,
                    "Botnet activity cluster detected near Katowice"
                ),
                new(
                    "bb1232b",
                    DateTime.UtcNow.AddMinutes(-130),
                    new List<Point>
                    {
                        new(54.6872, 25.2797),
                        new(54.6885, 25.2850),
                        new(54.6860, 25.2750),
                        new(54.6890, 25.2905),
                        new(54.6850, 25.2720)
                    },
                    5,
                    "Suspicious network behavior extending to Vilnius"
                ),
                new(
                    "5555bbb",
                    DateTime.UtcNow.AddMinutes(-160),
                    new List<Point>
                    {
                        new(49.1951, 16.6068),
                        new(49.1970, 16.6100),
                        new(49.1935, 16.6020),
                        new(49.1990, 16.6130),
                        new(49.1910, 16.5980)
                    },
                    7,
                    "Large-scale anomalous communication detected in Brno"
                ),
                new(
                    "1111",
                    DateTime.UtcNow.AddMinutes(-180),
                    new List<Point>
                    {
                        new(52.5200, 13.4050),
                        new(52.5210, 13.4050),
                        new(52.5220, 13.4050),
                        new(52.5230, 13.4050),
                        new(52.5240, 13.4050)
                    },
                    5,
                    "Vertical anomaly line detected in Berlin"
                ),
                new(
                    "666bbb",
                    DateTime.UtcNow.AddMinutes(-200),
                    new List<Point>
                    {
                        new(48.8566, 2.3522),
                        new(48.8566, 2.3510),
                        new(48.8566, 2.3500),
                        new(48.8566, 2.3490),
                        new(48.8566, 2.3480)
                    },
                    4,
                    "Horizontal anomaly line detected in Paris"
                )
            };

            return Results.Ok(summaries);
        });


        app.Run();
    }
}
