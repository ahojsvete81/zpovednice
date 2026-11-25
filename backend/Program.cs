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
    return Results.Ok(new
    {
        status = canConnect ? "ok" : "degraded",
        database = "SQL Server / ZpovedniceDb",
        dbConnected = canConnect,
        sinWallCount = wallCount,
        billingEnabled,
        aiMode = ai.IsLiveAiConfigured ? "live-llm" : "crafted-czech-demo",
        timestamp = DateTime.UtcNow
    });
});

// Personas (free during Open Pilot when BillingEnabled=false)
api.MapGet("/personas", () =>
    Results.Ok(PersonaCatalog.All.Select(p =>
        billingEnabled
            ? p.PublicInfo
            : p.PublicInfo with { OdpustkyCost = 0, IsPremium = false })));

// Couple Blind Desire Cards catalog
api.MapGet("/couple/cards", () => Results.Ok(CoupleCardCatalog.All));

// Wallet
api.MapGet("/wallet/{clientId}", async (string clientId, ZpovedniceDbContext db) =>
{
    var wallet = await GetOrCreateWalletAsync(db, clientId);
    return Results.Ok(ToWalletDto(wallet));
});

// Desire Atlas Profile
api.MapGet("/profile/{clientId}", async (string clientId, ZpovedniceDbContext db) =>
{
    var profile = await DesireProfileService.GetOrCreateAsync(db, clientId);
    return Results.Ok(DesireProfileService.ToDto(profile));
});

// Return Loop: Mark Penance Completed
api.MapPost("/profile/penance-complete", async (CompletePenanceRequest req, ZpovedniceDbContext db) =>
{
    var profile = await DesireProfileService.GetOrCreateAsync(db, req.ClientId);
    DesireProfileService.UpdateFromPenanceFeedback(profile, req.PenanceTitle, req.Feedback);
    await db.SaveChangesAsync();

    var reply = req.Feedback switch
    {
        "bolder" => "Odvaha roste s chutí. Tvůj Atlas touhy se posunul k temnějšímu žáru — příště přitvrdíme.",
        "gentler" => "Skvělá zpětná vazba. Tvůj Atlas si zapamatoval, že oceníš pomalejší a něžnější tempo.",
        _ => "Pečeť splnění uložena. Tvá úroveň zasvěcení roste a Zpovědník tě teď zná o kus lépe."
    };

    return Results.Ok(new
    {
        message = reply,
        profile = DesireProfileService.ToDto(profile)
    });
});

// Daily Sin Question (rotates by UTC day of year)
api.MapGet("/daily-question", async (ZpovedniceDbContext db) =>
{
    var questions = await db.DailyQuestions.OrderBy(q => q.Id).ToListAsync();
    if (questions.Count == 0) return Results.NotFound();
    var today = questions[DateTime.UtcNow.DayOfYear % questions.Count];
    return Results.Ok(ToDailyDto(today));
});

api.MapPost("/daily-question/{id:int}/vote", async (int id, VoteDailyQuestionRequest req, ZpovedniceDbContext db) =>
{
    var q = await db.DailyQuestions.FirstOrDefaultAsync(x => x.Id == id);
    if (q is null) return Results.NotFound();

    if (req.Choice.Equals("A", StringComparison.OrdinalIgnoreCase)) q.VotesA += 1;
    else if (req.Choice.Equals("B", StringComparison.OrdinalIgnoreCase)) q.VotesB += 1;
    else return Results.BadRequest(new { error = "Volba musí být 'A' nebo 'B'." });

    await db.SaveChangesAsync();
    return Results.Ok(ToDailyDto(q));
});

// Purchase (kept ready behind BillingEnabled flag)
api.MapPost("/wallet/purchase", async (PurchasePackageRequest req, ZpovedniceDbContext db) =>
{
    if (!billingEnabled)
        return Results.Ok(new PurchaseResponse(true, "Otevřený pilot: vše je nyní zcela zdarma.", ToWalletDto(await GetOrCreateWalletAsync(db, req.ClientId))));

    var wallet = await GetOrCreateWalletAsync(db, req.ClientId);
    var (delta, amountCzk, isVip, description) = req.PackageCode switch
    {
        "couple_night" => (3, 99, false, "Večer rozhřešení pro dva (3 Odpustky)"),
        "pack_10" => (10, 149, false, "Balíček 10 Odpustků"),
        "vip_month" => (25, 249, true, "Řád Hříšníků VIP (+25 Odpustků)"),
        _ => (0, 0, false, string.Empty)
    };
    if (delta == 0) return Results.BadRequest(new { error = "Neznámý balíček." });

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
    return Results.Ok(new PurchaseResponse(true, $"Připsáno: {description}.", ToWalletDto(wallet)));
});

// Solo Layer 2: Socratic Deep Probe
api.MapPost("/confessions/solo/probe", async (
    SoloProbeRequest req,
    SafetyGuardrailService safety,
    AiConfessorService ai,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(req.ConfessionText) || req.ConfessionText.Trim().Length < 8)
        return Results.BadRequest(new { error = "Zašeptej alespoň krátkou větu (min. 8 znaků)." });

    var persona = PersonaCatalog.GetById(req.PersonaId);
    var safetyCheck = safety.Evaluate(req.ConfessionText);
    if (safetyCheck.IsBlocked)
    {
        return Results.Ok(new SoloProbeResponse(
            PersonaId: persona.PublicInfo.Id,
            PersonaName: "Bezpečnostní strážce",
            MirrorReaction: safetyCheck.CrisisHelp!.Message,
            ProbingQuestion: string.Empty,
            QuickChoices: [],
            UsedLiveAi: false,
            IsSafetyIntervention: true,
            CrisisHelp: safetyCheck.CrisisHelp
        ));
    }

    var probe = await ai.GenerateSoloProbeAsync(persona, req.ConfessionText.Trim(), req.Intensity, ct);
    return Results.Ok(new SoloProbeResponse(
        PersonaId: persona.PublicInfo.Id,
        PersonaName: persona.PublicInfo.Name,
        MirrorReaction: probe.MirrorReaction,
        ProbingQuestion: probe.ProbingQuestion,
        QuickChoices: probe.QuickChoices,
        UsedLiveAi: probe.UsedLiveAi,
        IsSafetyIntervention: false,
        CrisisHelp: null
    ));
});

// Solo Layer 3: Full Absolution & Penance + Atlas Evolution
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
    var profile = await DesireProfileService.GetOrCreateAsync(db, req.ClientId);
    var persona = PersonaCatalog.GetById(req.PersonaId);

    var safetyCheck = safety.Evaluate($"{req.ConfessionText} {req.DeepAnswer}");
    if (safetyCheck.IsBlocked)
    {
        return Results.Ok(new SoloConfessionResponse(
            SessionId: Guid.Empty,
            PersonaId: persona.PublicInfo.Id,
            PersonaName: "Bezpečnostní strážce",
            SinIndex: 0,
            Archetype: "Bezpečnostní zastavení",
            AbsolutionText: safetyCheck.CrisisHelp!.Message,
            Penance: new PenanceDto("Krok k bezpečí", "Prosím využij některý z kontaktů níže.", "Okamžitě", "Bezpečí"),
            VoiceScript: string.Empty,
            UsedLiveAi: false,
            IsSafetyIntervention: true,
            CrisisHelp: safetyCheck.CrisisHelp,
            Wallet: ToWalletDto(wallet),
            Profile: DesireProfileService.ToDto(profile)
        ));
    }

    var cost = (!billingEnabled || wallet.IsVip) ? 0 : persona.PublicInfo.OdpustkyCost;
    if (cost > 0 && wallet.OdpustkyBalance < cost)
    {
        return Results.Json(new { error = $"Vyžaduje {cost} Odpustek.", code = "INSUFFICIENT_ODPUSTKY" }, statusCode: 402);
    }

    var aiResult = await ai.GenerateSoloAbsolutionAsync(
        persona, req.ConfessionText.Trim(), req.Intensity, req.ProbeQuestion, req.DeepAnswer, req.ContextMode, ct);

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

    // Evolve privacy-preserving Desire Atlas (no raw text saved!)
    DesireProfileService.UpdateFromSoloConfession(
        profile, req.ConfessionText, req.DeepAnswer, persona.PublicInfo.Id, req.Intensity, aiResult.Archetype, aiResult.Penance.Title);

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
        Wallet: ToWalletDto(wallet),
        Profile: DesireProfileService.ToDto(profile)
    ));
});

// Burn to Absolve — hard-deletes session row from MSSQL
api.MapDelete("/confessions/{sessionId:guid}/burn", async (Guid sessionId, ZpovedniceDbContext db) =>
{
    var deleted = await db.ConfessionSessions.Where(s => s.Id == sessionId).ExecuteDeleteAsync();
    return Results.Ok(new
    {
        burned = true,
        removedRecords = deleted,
        message = "Zpověď shořela v plamenech a byla nenávratně smazána z databáze."
    });
});

// Couple Mode 2.0 — Create ephemeral room ("deck" | "confession" | "honesty")
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

// Couple Mode 2.0 — Room status (NEVER leaks raw partner cards or confessions!)
api.MapGet("/couple/rooms/{roomCode}", async (string roomCode, ZpovedniceDbContext db) =>
{
    var normalized = roomCode.Trim().ToUpperInvariant();
    var room = await db.CoupleRooms.FirstOrDefaultAsync(r => r.RoomCode == normalized);
    if (room is null)
        return Results.NotFound(new { error = "Párová zpovědnice s tímto kódem neexistuje nebo již shořela." });

    return Results.Ok(ToCoupleStatus(room));
});

// Couple Mode 2.0 — Submit Partner A or B (Deck OR Confession OR Brave Honesty)
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

    // Once both submitted -> synthesize Evening Scenario & IMMEDIATELY WIPE raw secrets!
    if (room.PartnerASubmitted && room.PartnerBSubmitted && string.IsNullOrWhiteSpace(room.ScenarioJson))
    {
        var wallet = await GetOrCreateWalletAsync(db, req.ClientId);
        var coupleCost = (!billingEnabled || wallet.IsVip) ? 0 : 2;
        if (coupleCost > 0 && wallet.OdpustkyBalance < coupleCost)
        {
            await db.SaveChangesAsync(ct);
            return Results.Json(new { error = "Vyžaduje 2 Odpustky.", code = "INSUFFICIENT_ODPUSTKY" }, statusCode: 402);
        }

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

        // Zero-leak privacy: wipe raw partner cards & texts immediately!
        room.PartnerAConfession = null;
        room.PartnerBConfession = null;
        room.PartnerACardsJson = null;
        room.PartnerBCardsJson = null;

        var profile = await DesireProfileService.GetOrCreateAsync(db, req.ClientId);
        DesireProfileService.UpdateFromCoupleNight(profile, scenario.ChemistryScore);

        if (coupleCost > 0)
        {
            wallet.OdpustkyBalance -= coupleCost;
            wallet.UpdatedAt = DateTime.UtcNow;
        }
    }

    await db.SaveChangesAsync(ct);
    return Results.Ok(ToCoupleStatus(room));
});

// Couple Mode — Burn room from SQL Server
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

// Sin Wall
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

app.MapFallbackToFile("index.html");
app.Run();

static async Task<WalletEntity> GetOrCreateWalletAsync(ZpovedniceDbContext db, string? rawClientId)
{
    var clientId = string.IsNullOrWhiteSpace(rawClientId) ? "anon-guest" : rawClientId.Trim();
    if (clientId.Length > 64) clientId = clientId[..64];

    var wallet = await db.Wallets.FirstOrDefaultAsync(w => w.ClientId == clientId);
    if (wallet is null)
    {
        wallet = new WalletEntity { ClientId = clientId, OdpustkyBalance = 3 };
        db.Wallets.Add(wallet);
        await db.SaveChangesAsync();
    }
    return wallet;
}

static WalletDto ToWalletDto(WalletEntity w) =>
    new(w.ClientId, w.OdpustkyBalance, w.IsVip, w.TotalConfessions);

static DailyQuestionDto ToDailyDto(DailyQuestionEntity q) =>
    new(q.Id, q.QuestionKey, q.QuestionText, q.OptionA, q.OptionB, q.VotesA, q.VotesB, q.ConfessorCommentA, q.ConfessorCommentB);

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
