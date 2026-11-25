using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Zpovednice.Api.Data;
using Zpovednice.Api.Endpoints;
using Zpovednice.Api.Models;
using Zpovednice.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Database=ZpovedniceDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true";

builder.Services.AddDbContext<ZpovedniceDbContext>(options =>
    options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(5), null)));

builder.Services.AddSingleton<SafetyGuardrailService>();
builder.Services.AddHttpClient<AiConfessorService>();

var app = builder.Build();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// Initialize & auto-upgrade MSSQL Database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ZpovedniceDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DbInitializer.InitializeAsync(db, logger);
}

var billingEnabled = app.Configuration.GetValue<bool>("Features:BillingEnabled");
var api = app.MapGroup("/api");

// Health & feature flags
api.MapGet("/health", async (ZpovedniceDbContext db, AiConfessorService ai) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    var wallCount = canConnect ? await db.SinWallEntries.CountAsync() : 0;
    var activePools = canConnect ? await db.GroupPools.CountAsync(p => p.ExpiresAt > DateTime.UtcNow) : 0;
    return Results.Ok(new
    {
        status = canConnect ? "ok" : "degraded",
        database = "SQL Server / ZpovedniceDb",
        dbConnected = canConnect,
        sinWallCount = wallCount,
        activePools,
        billingEnabled,
        aiMode = ai.IsLiveAiConfigured ? "live-llm" : "crafted-czech-demo",
        timestamp = DateTime.UtcNow
    });
});

// Personas (all free during Open Pilot)
api.MapGet("/personas", () =>
    Results.Ok(PersonaCatalog.All.Select(p =>
        billingEnabled
            ? p.PublicInfo
            : p.PublicInfo with { OdpustkyCost = 0, IsPremium = false })));

// Couple Blind Desire Cards catalog
api.MapGet("/couple/cards", () => Results.Ok(CoupleCardCatalog.All));

// Desire Atlas Profile (built strictly from Couple Nights & Group Pool Rendezvous)
api.MapGet("/profile/{clientId}", async (string clientId, ZpovedniceDbContext db) =>
{
    var profile = await DesireProfileService.GetOrCreateAsync(db, clientId);
    return Results.Ok(DesireProfileService.ToDto(profile));
});

// ─── TAJNÝ KRUH (GROUP POOL FOR 6–30 PEOPLE) ─────────────────────────────────
api.MapGroupPoolEndpoints();

// ─── COUPLE MODE 2.0 ──────────────────────────────────────────────────────────
api.MapPost("/couple/rooms", async (CreateCoupleRoomRequest req, ZpovedniceDbContext db) =>
{
    var normalizedMode = req.Mode is "confession" or "honesty" ? req.Mode : "deck";
    var room = new CoupleRoomEntity
    {
        RoomCode = GenerateRoomCode(),
        PersonaId = PersonaCatalog.GetById(req.PersonaId).PublicInfo.Id,
        Intensity = string.IsNullOrWhiteSpace(req.Intensity) ? "spicy" : req.Intensity,
        Mode = normalizedMode,
        ExpiresAt = DateTime.UtcNow.AddHours(12)
    };

    db.CoupleRooms.Add(room);
    await db.SaveChangesAsync();
    return Results.Ok(ToCoupleStatus(room));
});

api.MapGet("/couple/rooms/{roomCode}", async (string roomCode, ZpovedniceDbContext db) =>
{
    var normalized = roomCode.Trim().ToUpperInvariant();
    var room = await db.CoupleRooms.FirstOrDefaultAsync(r => r.RoomCode == normalized);
    if (room is null)
        return Results.NotFound(new { error = "Párová zpovědnice s tímto kódem neexistuje nebo již shořela." });

    return Results.Ok(ToCoupleStatus(room));
});

api.MapPost("/couple/rooms/{roomCode}/submit", async (
    string roomCode,
    SubmitCoupleConfessionRequest req,
    ZpovedniceDbContext db,
    SafetyGuardrailService safety,
    AiConfessorService ai,
    CancellationToken ct) =>
{
    var normalized = roomCode.Trim().ToUpperInvariant();
    var room = await db.CoupleRooms.FirstOrDefaultAsync(r => r.RoomCode == normalized, ct);
    if (room is null)
        return Results.NotFound(new { error = "Párová zpovědnice nebyla nalezena." });

    var role = req.PartnerRole.Trim().ToUpperInvariant();
    if (role is not ("A" or "B"))
        return Results.BadRequest(new { error = "Role musí být 'A' nebo 'B'." });

    if (room.Mode == "deck")
    {
        if (req.CardVotes is null || req.CardVotes.Count < 4)
            return Results.BadRequest(new { error = "Ohodnoť alespoň 4 tajné karty, aby Zpovědník našel shody." });

        var cardsJson = JsonSerializer.Serialize(req.CardVotes);
        if (role == "A") { room.PartnerACardsJson = cardsJson; room.PartnerASubmitted = true; }
        else { room.PartnerBCardsJson = cardsJson; room.PartnerBSubmitted = true; }
    }
    else
    {
        if (string.IsNullOrWhiteSpace(req.ConfessionText) || req.ConfessionText.Trim().Length < 8)
            return Results.BadRequest(new { error = "Napiš alespoň krátkou větu (min. 8 znaků)." });

        var safetyCheck = safety.Evaluate(req.ConfessionText);
        if (safetyCheck.IsBlocked)
            return Results.BadRequest(new { error = safetyCheck.CrisisHelp!.Message, crisisHelp = safetyCheck.CrisisHelp });

        var boundariesText = req.Boundaries is { Count: > 0 } ? string.Join(", ", req.Boundaries) : null;
        if (role == "A")
        {
            room.PartnerAConfession = req.ConfessionText.Trim();
            room.PartnerABoundaries = boundariesText;
            room.PartnerASubmitted = true;
        }
        else
        {
            room.PartnerBConfession = req.ConfessionText.Trim();
            room.PartnerBBoundaries = boundariesText;
            room.PartnerBSubmitted = true;
        }
    }

    if (room.PartnerASubmitted && room.PartnerBSubmitted && string.IsNullOrWhiteSpace(room.ScenarioJson))
    {
        var persona = PersonaCatalog.GetById(room.PersonaId);
        CoupleScenarioDto scenario;

        if (room.Mode == "deck")
        {
            var votesA = JsonSerializer.Deserialize<Dictionary<string, string>>(room.PartnerACardsJson ?? "{}") ?? [];
            var votesB = JsonSerializer.Deserialize<Dictionary<string, string>>(room.PartnerBCardsJson ?? "{}") ?? [];
            scenario = await ai.GenerateCoupleDeckScenarioAsync(persona, votesA, votesB, room.Intensity, ct);
        }
        else
        {
            scenario = await ai.GenerateCoupleScenarioAsync(
                persona,
                room.Mode,
                room.PartnerAConfession!,
                room.PartnerABoundaries,
                room.PartnerBConfession!,
                room.PartnerBBoundaries,
                room.Intensity,
                ct);
        }

        room.ScenarioJson = JsonSerializer.Serialize(scenario);
        room.PartnerAConfession = null;
        room.PartnerBConfession = null;
        room.PartnerACardsJson = null;
        room.PartnerBCardsJson = null;

        var profile = await DesireProfileService.GetOrCreateAsync(db, req.ClientId);
        DesireProfileService.UpdateFromCoupleNight(profile, scenario.ChemistryScore);
    }

    await db.SaveChangesAsync(ct);
    return Results.Ok(ToCoupleStatus(room));
});

api.MapDelete("/couple/rooms/{roomCode}/burn", async (string roomCode, ZpovedniceDbContext db) =>
{
    var normalized = roomCode.Trim().ToUpperInvariant();
    var deleted = await db.CoupleRooms.Where(r => r.RoomCode == normalized).ExecuteDeleteAsync();
    return Results.Ok(new
    {
        burned = true,
        removedRecords = deleted,
        message = "Párová zpovědnice shořela v plamenech a všechny stopy byly smazány."
    });
});

// ─── SIN WALL ─────────────────────────────────────────────────────────────────
api.MapGet("/wall", async (ZpovedniceDbContext db) =>
{
    var entries = await db.SinWallEntries
        .OrderByDescending(e => e.CreatedAt)
        .Take(30)
        .Select(e => new SinWallEntryDto(
            e.Id, e.ConfessionText, e.PersonaName, e.SinIndex, e.Archetype,
            e.Category, e.ForgivenCount, e.HellCount, e.CreatedAt))
        .ToListAsync();
    return Results.Ok(entries);
});

api.MapPost("/wall/{id:guid}/vote", async (Guid id, VoteSinWallRequest req, ZpovedniceDbContext db) =>
{
    var entry = await db.SinWallEntries.FirstOrDefaultAsync(e => e.Id == id);
    if (entry is null) return Results.NotFound();

    if (req.Vote.Equals("forgive", StringComparison.OrdinalIgnoreCase)) entry.ForgivenCount += 1;
    else if (req.Vote.Equals("hell", StringComparison.OrdinalIgnoreCase)) entry.HellCount += 1;
    else return Results.BadRequest(new { error = "Hlas musí být 'forgive' nebo 'hell'." });

    await db.SaveChangesAsync();
    return Results.Ok(new SinWallEntryDto(
        entry.Id, entry.ConfessionText, entry.PersonaName, entry.SinIndex,
        entry.Archetype, entry.Category, entry.ForgivenCount, entry.HellCount, entry.CreatedAt));
});

api.MapPost("/wall", async (PublishSinWallRequest req, ZpovedniceDbContext db, SafetyGuardrailService safety) =>
{
    if (string.IsNullOrWhiteSpace(req.ConfessionText) || req.ConfessionText.Trim().Length < 10)
        return Results.BadRequest(new { error = "Zpověď na zeď musí mít alespoň 10 znaků." });

    var check = safety.Evaluate(req.ConfessionText);
    if (check.IsBlocked) return Results.BadRequest(new { error = check.CrisisHelp!.Message });

    var entry = new SinWallEntryEntity
    {
        ConfessionText = req.ConfessionText.Trim(),
        Category = string.IsNullOrWhiteSpace(req.Category) ? "Tajný Kruh" : req.Category.Trim(),
        PersonaName = string.IsNullOrWhiteSpace(req.PersonaName) ? "Mefisto" : req.PersonaName.Trim(),
        SinIndex = Math.Clamp(req.SinIndex, 1, 99),
        Archetype = string.IsNullOrWhiteSpace(req.Archetype) ? "Anonymní maska" : req.Archetype.Trim(),
        ForgivenCount = 1,
        HellCount = 0
    };

    db.SinWallEntries.Add(entry);
    await db.SaveChangesAsync();
    return Results.Ok(new SinWallEntryDto(
        entry.Id, entry.ConfessionText, entry.PersonaName, entry.SinIndex,
        entry.Archetype, entry.Category, entry.ForgivenCount, entry.HellCount, entry.CreatedAt));
});

app.MapFallbackToFile("index.html");
app.Run();

static CoupleRoomStatusResponse ToCoupleStatus(CoupleRoomEntity room)
{
    CoupleScenarioDto? scenario = null;
    if (!string.IsNullOrWhiteSpace(room.ScenarioJson))
        scenario = JsonSerializer.Deserialize<CoupleScenarioDto>(room.ScenarioJson);

    return new CoupleRoomStatusResponse(
        RoomCode: room.RoomCode,
        PersonaId: room.PersonaId,
        Intensity: room.Intensity,
        Mode: room.Mode,
        PartnerASubmitted: room.PartnerASubmitted,
        PartnerBSubmitted: room.PartnerBSubmitted,
        IsReady: scenario is not null,
        Scenario: scenario,
        ExpiresAt: room.ExpiresAt
    );
}

static string GenerateRoomCode()
{
    const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var suffix = new string(Enumerable.Range(0, 4).Select(_ => chars[Random.Shared.Next(chars.Length)]).ToArray());
    return $"SIN-{suffix}";
}
