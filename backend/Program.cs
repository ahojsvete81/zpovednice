using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Zpovednice.Api.Data;
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
    options.UseSqlServer(connectionString));

builder.Services.AddSingleton<SafetyGuardrailService>();
builder.Services.AddHttpClient<AiConfessorService>();

var app = builder.Build();
app.UseCors();

// Initialize MSSQL Database & Seed Sin Wall
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ZpovedniceDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DbInitializer.InitializeAsync(db, logger);
}

var api = app.MapGroup("/api");

// Health & status
api.MapGet("/health", async (ZpovedniceDbContext db, AiConfessorService ai) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    var wallCount = canConnect ? await db.SinWallEntries.CountAsync() : 0;
    return Results.Ok(new
    {
        status = canConnect ? "ok" : "degraded",
        database = "SQL Server (localhost / ZpovedniceDb)",
        dbConnected = canConnect,
        sinWallCount = wallCount,
        aiMode = ai.IsLiveAiConfigured ? "live-llm" : "crafted-czech-demo",
        timestamp = DateTime.UtcNow
    });
});

// Personas
api.MapGet("/personas", () =>
    Results.Ok(PersonaCatalog.All.Select(p => p.PublicInfo)));

// Wallet
api.MapGet("/wallet/{clientId}", async (string clientId, ZpovedniceDbContext db) =>
{
    var wallet = await GetOrCreateWalletAsync(db, clientId);
    return Results.Ok(ToWalletDto(wallet));
});

// Simulated Stripe/Odpustky purchase
api.MapPost("/wallet/purchase", async (PurchasePackageRequest req, ZpovedniceDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.ClientId))
        return Results.BadRequest(new { error = "Chybí identifikátor klienta." });

    var wallet = await GetOrCreateWalletAsync(db, req.ClientId);

    var (delta, amountCzk, isVip, description) = req.PackageCode switch
    {
        "couple_night" => (3, 99, false, "Večer rozhřešení pro dva (3 Odpustky)"),
        "pack_10" => (10, 149, false, "Balíček 10 Odpustků"),
        "vip_month" => (25, 249, true, "Řád Hříšníků VIP — měsíční členství (+25 Odpustků)"),
        _ => (0, 0, false, string.Empty)
    };

    if (delta == 0)
        return Results.BadRequest(new { error = "Neznámý balíček Odpustků." });

    wallet.OdpustkyBalance += delta;
    if (isVip) wallet.IsVip = true;
    wallet.UpdatedAt = DateTime.UtcNow;

    db.CreditTransactions.Add(new CreditTransactionEntity
    {
        ClientId = wallet.ClientId,
        PackageCode = req.PackageCode,
        OdpustkyDelta = delta,
        AmountCzk = amountCzk,
        Description = description
    });

    await db.SaveChangesAsync();

    return Results.Ok(new PurchaseResponse(
        Success: true,
        Message: $"Děkujeme! Připsáno: {description}.",
        Wallet: ToWalletDto(wallet)
    ));
});

// Solo Confession
api.MapPost("/confessions/solo", async (
    SoloConfessionRequest req,
    ZpovedniceDbContext db,
    SafetyGuardrailService safety,
    AiConfessorService ai,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(req.ConfessionText) || req.ConfessionText.Trim().Length < 8)
        return Results.BadRequest(new { error = "Napiš alespoň krátkou větu své zpovědi (min. 8 znaků)." });

    var wallet = await GetOrCreateWalletAsync(db, req.ClientId);
    var persona = PersonaCatalog.GetById(req.PersonaId);

    // 1. Mandatory Safety Guardrail
    var safetyCheck = safety.Evaluate(req.ConfessionText);
    if (safetyCheck.IsBlocked)
    {
        return Results.Ok(new SoloConfessionResponse(
            SessionId: Guid.Empty,
            PersonaId: persona.PublicInfo.Id,
            PersonaName: "Bezpečnostní strážce",
            SinIndex: 0,
            Archetype: "Bezpečnostní zastavení",
            AbsolutionText: safetyCheck.CrisisHelp!.Message,
            Penance: new PenanceDto("Krok k bezpečí", "Prosím využij některý z kontaktů níže. Nejsi na to sám/sama.", "Okamžitě", "Bezpečí"),
            VoiceScript: string.Empty,
            UsedLiveAi: false,
            IsSafetyIntervention: true,
            CrisisHelp: safetyCheck.CrisisHelp,
            Wallet: ToWalletDto(wallet)
        ));
    }

    // 2. Credit check for premium personas
    var cost = wallet.IsVip ? 0 : persona.PublicInfo.OdpustkyCost;
    if (cost > 0 && wallet.OdpustkyBalance < cost)
    {
        return Results.Json(new
        {
            error = $"Zpovědník {persona.PublicInfo.Name} vyžaduje {cost} Odpustek. Pořiď si balíček Odpustků nebo zvol Otce Dominika zdarma.",
            code = "INSUFFICIENT_ODPUSTKY"
        }, statusCode: StatusCodes.Status402PaymentRequired);
    }

    // 3. Generate Absolution & Penance
    var aiResult = await ai.GenerateSoloAbsolutionAsync(persona, req.ConfessionText.Trim(), req.Intensity, ct);

    if (cost > 0)
    {
        wallet.OdpustkyBalance -= cost;
        db.CreditTransactions.Add(new CreditTransactionEntity
        {
            ClientId = wallet.ClientId,
            PackageCode = $"persona_{persona.PublicInfo.Id}",
            OdpustkyDelta = -cost,
            AmountCzk = 0,
            Description = $"Zpověď u: {persona.PublicInfo.Name}"
        });
    }

    wallet.TotalConfessions += 1;
    wallet.UpdatedAt = DateTime.UtcNow;

    // 4. Store ONLY ephemeral session (raw confession text is NOT persisted!)
    var session = new ConfessionSessionEntity
    {
        ClientId = wallet.ClientId,
        PersonaId = persona.PublicInfo.Id,
        Intensity = req.Intensity,
        SinIndex = aiResult.SinIndex,
        Archetype = aiResult.Archetype,
        AbsolutionText = aiResult.AbsolutionText,
        PenanceTitle = aiResult.Penance.Title,
        PenanceDescription = aiResult.Penance.Description,
        PenanceTiming = aiResult.Penance.Timing,
        VoiceScript = aiResult.VoiceScript
    };
    db.ConfessionSessions.Add(session);

    // 5. Optional anonymous publish to Sin Wall
    if (req.PublishToWall)
    {
        db.SinWallEntries.Add(new SinWallEntryEntity
        {
            ConfessionText = req.ConfessionText.Trim(),
            PersonaName = persona.PublicInfo.Name,
            SinIndex = aiResult.SinIndex,
            Archetype = aiResult.Archetype,
            Category = "Nová zpověď",
            ForgivenCount = 1,
            HellCount = 0
        });
    }

    await db.SaveChangesAsync(ct);

    return Results.Ok(new SoloConfessionResponse(
        SessionId: session.Id,
        PersonaId: persona.PublicInfo.Id,
        PersonaName: persona.PublicInfo.Name,
        SinIndex: aiResult.SinIndex,
        Archetype: aiResult.Archetype,
        AbsolutionText: aiResult.AbsolutionText,
        Penance: aiResult.Penance,
        VoiceScript: aiResult.VoiceScript,
        UsedLiveAi: aiResult.UsedLiveAi,
        IsSafetyIntervention: false,
        CrisisHelp: null,
        Wallet: ToWalletDto(wallet)
    ));
});

// Burn to Absolve — hard-deletes session row from MSSQL
api.MapDelete("/confessions/{sessionId:guid}/burn", async (Guid sessionId, ZpovedniceDbContext db) =>
{
    var deleted = await db.ConfessionSessions
        .Where(s => s.Id == sessionId)
        .ExecuteDeleteAsync();

    return Results.Ok(new
    {
        burned = true,
        removedRecords = deleted,
        message = "Zpověď shořela v plamenech a byla nenávratně smazána z databáze."
    });
});

// Couple Mode — Create ephemeral room
api.MapPost("/couple/rooms", async (CreateCoupleRoomRequest req, ZpovedniceDbContext db) =>
{
    var roomCode = GenerateRoomCode();
    var room = new CoupleRoomEntity
    {
        RoomCode = roomCode,
        PersonaId = PersonaCatalog.GetById(req.PersonaId).PublicInfo.Id,
        Intensity = string.IsNullOrWhiteSpace(req.Intensity) ? "spicy" : req.Intensity,
        ExpiresAt = DateTime.UtcNow.AddHours(12)
    };

    db.CoupleRooms.Add(room);
    await db.SaveChangesAsync();

    return Results.Ok(ToCoupleStatus(room));
});

// Couple Mode — Get room status (NEVER leaks raw partner confessions!)
api.MapGet("/couple/rooms/{roomCode}", async (string roomCode, ZpovedniceDbContext db) =>
{
    var normalized = roomCode.Trim().ToUpperInvariant();
    var room = await db.CoupleRooms.FirstOrDefaultAsync(r => r.RoomCode == normalized);
    if (room is null)
        return Results.NotFound(new { error = "Párová zpovědnice s tímto kódem neexistuje nebo již shořela." });

    return Results.Ok(ToCoupleStatus(room));
});

// Couple Mode — Submit Partner A or B secret confession
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

    if (string.IsNullOrWhiteSpace(req.ConfessionText) || req.ConfessionText.Trim().Length < 8)
        return Results.BadRequest(new { error = "Napiš alespoň krátké tajné přání (min. 8 znaků)." });

    var safetyCheck = safety.Evaluate(req.ConfessionText);
    if (safetyCheck.IsBlocked)
        return Results.BadRequest(new { error = safetyCheck.CrisisHelp!.Message, crisisHelp = safetyCheck.CrisisHelp });

    var boundariesText = req.Boundaries is { Count: > 0 } ? string.Join(", ", req.Boundaries) : null;
    var role = req.PartnerRole.Trim().ToUpperInvariant();

    if (role == "A")
    {
        room.PartnerAConfession = req.ConfessionText.Trim();
        room.PartnerABoundaries = boundariesText;
        room.PartnerASubmitted = true;
    }
    else if (role == "B")
    {
        room.PartnerBConfession = req.ConfessionText.Trim();
        room.PartnerBBoundaries = boundariesText;
        room.PartnerBSubmitted = true;
    }
    else
    {
        return Results.BadRequest(new { error = "Role musí být 'A' nebo 'B'." });
    }

    // Once both partners submitted, run Blind Desire Matching and IMMEDIATELY wipe raw partner confessions!
    if (room.PartnerASubmitted && room.PartnerBSubmitted && string.IsNullOrWhiteSpace(room.ScenarioJson))
    {
        var wallet = await GetOrCreateWalletAsync(db, req.ClientId);
        var coupleCost = wallet.IsVip ? 0 : 2;
        if (coupleCost > 0 && wallet.OdpustkyBalance < coupleCost)
        {
            await db.SaveChangesAsync(ct);
            return Results.Json(new
            {
                error = "Odemčení společného Večera rozhřešení vyžaduje 2 Odpustky (nebo členství Řád Hříšníků).",
                code = "INSUFFICIENT_ODPUSTKY"
            }, statusCode: StatusCodes.Status402PaymentRequired);
        }

        var persona = PersonaCatalog.GetById(room.PersonaId);
        var scenario = await ai.GenerateCoupleScenarioAsync(
            persona,
            room.PartnerAConfession!,
            room.PartnerABoundaries,
            room.PartnerBConfession!,
            room.PartnerBBoundaries,
            room.Intensity,
            ct);

        room.ScenarioJson = JsonSerializer.Serialize(scenario);
        // Privacy by design: wipe raw confessions right after synthesis!
        room.PartnerAConfession = null;
        room.PartnerBConfession = null;

        if (coupleCost > 0)
        {
            wallet.OdpustkyBalance -= coupleCost;
            wallet.UpdatedAt = DateTime.UtcNow;
            db.CreditTransactions.Add(new CreditTransactionEntity
            {
                ClientId = wallet.ClientId,
                PackageCode = "couple_reveal",
                OdpustkyDelta = -coupleCost,
                AmountCzk = 0,
                Description = $"Párová zpovědnice ({room.RoomCode})"
            });
        }
    }

    await db.SaveChangesAsync(ct);
    return Results.Ok(ToCoupleStatus(room));
});

// Couple Mode — Burn room from SQL Server
api.MapDelete("/couple/rooms/{roomCode}/burn", async (string roomCode, ZpovedniceDbContext db) =>
{
    var normalized = roomCode.Trim().ToUpperInvariant();
    var deleted = await db.CoupleRooms
        .Where(r => r.RoomCode == normalized)
        .ExecuteDeleteAsync();

    return Results.Ok(new
    {
        burned = true,
        removedRecords = deleted,
        message = "Párová zpovědnice shořela v plamenech a všechny stopy byly smazány."
    });
});

// Sin Wall — List
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

// Sin Wall — Vote ("forgive" or "hell")
api.MapPost("/wall/{id:guid}/vote", async (Guid id, VoteSinWallRequest req, ZpovedniceDbContext db) =>
{
    var entry = await db.SinWallEntries.FirstOrDefaultAsync(e => e.Id == id);
    if (entry is null) return Results.NotFound();

    if (req.Vote.Equals("forgive", StringComparison.OrdinalIgnoreCase))
        entry.ForgivenCount += 1;
    else if (req.Vote.Equals("hell", StringComparison.OrdinalIgnoreCase))
        entry.HellCount += 1;
    else
        return Results.BadRequest(new { error = "Hlas musí být 'forgive' nebo 'hell'." });

    await db.SaveChangesAsync();

    return Results.Ok(new SinWallEntryDto(
        entry.Id, entry.ConfessionText, entry.PersonaName, entry.SinIndex,
        entry.Archetype, entry.Category, entry.ForgivenCount, entry.HellCount, entry.CreatedAt));
});

// Sin Wall — Publish anonymous entry
api.MapPost("/wall", async (PublishSinWallRequest req, ZpovedniceDbContext db, SafetyGuardrailService safety) =>
{
    if (string.IsNullOrWhiteSpace(req.ConfessionText) || req.ConfessionText.Trim().Length < 10)
        return Results.BadRequest(new { error = "Zpověď na zeď musí mít alespoň 10 znaků." });

    var check = safety.Evaluate(req.ConfessionText);
    if (check.IsBlocked)
        return Results.BadRequest(new { error = check.CrisisHelp!.Message });

    var entry = new SinWallEntryEntity
    {
        ConfessionText = req.ConfessionText.Trim(),
        Category = string.IsNullOrWhiteSpace(req.Category) ? "Fantazie" : req.Category.Trim(),
        PersonaName = string.IsNullOrWhiteSpace(req.PersonaName) ? "Otec Dominik" : req.PersonaName.Trim(),
        SinIndex = Math.Clamp(req.SinIndex, 1, 99),
        Archetype = string.IsNullOrWhiteSpace(req.Archetype) ? "Anonymní hříšník" : req.Archetype.Trim(),
        ForgivenCount = 1,
        HellCount = 0
    };

    db.SinWallEntries.Add(entry);
    await db.SaveChangesAsync();

    return Results.Ok(new SinWallEntryDto(
        entry.Id, entry.ConfessionText, entry.PersonaName, entry.SinIndex,
        entry.Archetype, entry.Category, entry.ForgivenCount, entry.HellCount, entry.CreatedAt));
});

app.Run();

static async Task<WalletEntity> GetOrCreateWalletAsync(ZpovedniceDbContext db, string? rawClientId)
{
    var clientId = string.IsNullOrWhiteSpace(rawClientId) ? "anon-guest" : rawClientId.Trim();
    if (clientId.Length > 64) clientId = clientId[..64];

    var wallet = await db.Wallets.FirstOrDefaultAsync(w => w.ClientId == clientId);
    if (wallet is null)
    {
        wallet = new WalletEntity
        {
            ClientId = clientId,
            OdpustkyBalance = 3, // Welcome gift: 3 free Odpustky to explore everything!
            IsVip = false,
            TotalConfessions = 0
        };
        db.Wallets.Add(wallet);
        await db.SaveChangesAsync();
    }
    return wallet;
}

static WalletDto ToWalletDto(WalletEntity w) =>
    new(w.ClientId, w.OdpustkyBalance, w.IsVip, w.TotalConfessions);

static CoupleRoomStatusResponse ToCoupleStatus(CoupleRoomEntity room)
{
    CoupleScenarioDto? scenario = null;
    if (!string.IsNullOrWhiteSpace(room.ScenarioJson))
    {
        scenario = JsonSerializer.Deserialize<CoupleScenarioDto>(room.ScenarioJson);
    }

    return new CoupleRoomStatusResponse(
        RoomCode: room.RoomCode,
        PersonaId: room.PersonaId,
        Intensity: room.Intensity,
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
    var rng = Random.Shared;
    var suffix = new string(Enumerable.Range(0, 4).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    return $"SIN-{suffix}";
}
