using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Zpovednice.Api.Data;
using Zpovednice.Api.Models;
using Zpovednice.Api.Services;

namespace Zpovednice.Api.Endpoints;

public static class GroupPoolEndpoints
{
    public static void MapGroupPoolEndpoints(this RouteGroupBuilder api)
    {
        var pool = api.MapGroup("/pool");

        pool.MapGet("/presets", () => Results.Ok(new PoolPresetsDto(
            GroupPoolCatalog.CluePresets,
            GroupPoolCatalog.QuickSparks,
            GroupPoolCatalog.MeetingSpots
        )));

        // Create a new Tajný Kruh + auto-join creator as first Mask
        pool.MapPost("/", async (CreatePoolRequest req, ZpovedniceDbContext db) =>
        {
            var clientId = NormalizeClientId(req.ClientId);
            var heat = req.HeatMode is "flirt" or "unleashed" ? req.HeatMode : "night";
            var title = string.IsNullOrWhiteSpace(req.Title) ? "Noční Klášter" : req.Title.Trim();
            if (title.Length > 120) title = title[..120];

            var code = GeneratePoolCode();
            var entity = new GroupPoolEntity
            {
                PoolCode = code,
                Title = title,
                HeatMode = heat,
                ExpiresAt = DateTime.UtcNow.AddHours(12)
            };
            db.GroupPools.Add(entity);

            var (maskName, maskSymbol) = GroupPoolCatalog.PickUnusedMask([]);
            var member = new PoolMemberEntity
            {
                PoolCode = code,
                ClientId = clientId,
                MaskName = maskName,
                MaskSymbol = maskSymbol,
                Gender = NormalizeGender(req.Gender),
                Seeking = NormalizeSeeking(req.Seeking),
                Clue1 = string.IsNullOrWhiteSpace(req.Clue1)
                    ? GroupPoolCatalog.CluePresets[0]
                    : req.Clue1.Trim(),
                GoldenMatchesLeft = 3
            };
            db.PoolMembers.Add(member);

            await db.SaveChangesAsync();
            return Results.Ok(await BuildPoolStateAsync(db, entity, clientId));
        });

        // Join existing Tajný Kruh (idempotent per clientId)
        pool.MapPost("/{poolCode}/join", async (string poolCode, JoinPoolRequest req, ZpovedniceDbContext db) =>
        {
            var code = poolCode.Trim().ToUpperInvariant();
            var entity = await db.GroupPools.FirstOrDefaultAsync(p => p.PoolCode == code);
            if (entity is null || entity.ExpiresAt < DateTime.UtcNow)
                return Results.NotFound(new { error = "Tento Tajný Kruh neexistuje nebo už po 12 hodinách shořel." });

            var clientId = NormalizeClientId(req.ClientId);
            var existing = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == code && m.ClientId == clientId);
            if (existing is null)
            {
                var usedNames = await db.PoolMembers
                    .Where(m => m.PoolCode == code)
                    .Select(m => m.MaskName)
                    .ToListAsync();

                var (maskName, maskSymbol) = GroupPoolCatalog.PickUnusedMask(usedNames);
                var member = new PoolMemberEntity
                {
                    PoolCode = code,
                    ClientId = clientId,
                    MaskName = maskName,
                    MaskSymbol = maskSymbol,
                    Gender = NormalizeGender(req.Gender),
                    Seeking = NormalizeSeeking(req.Seeking),
                    Clue1 = string.IsNullOrWhiteSpace(req.Clue1)
                        ? GroupPoolCatalog.CluePresets[0]
                        : req.Clue1.Trim(),
                    GoldenMatchesLeft = 3
                };
                db.PoolMembers.Add(member);
                await db.SaveChangesAsync();
            }

            return Results.Ok(await BuildPoolStateAsync(db, entity, clientId));
        });

        // Live state tailored strictly to clientId (auto-polled every 3s on mobile)
        pool.MapGet("/{poolCode}/state", async (string poolCode, string clientId, ZpovedniceDbContext db) =>
        {
            var code = poolCode.Trim().ToUpperInvariant();
            var entity = await db.GroupPools.FirstOrDefaultAsync(p => p.PoolCode == code);
            if (entity is null || entity.ExpiresAt < DateTime.UtcNow)
                return Results.NotFound(new { error = "Tajný Kruh neexistuje nebo již vypršel." });

            return Results.Ok(await BuildPoolStateAsync(db, entity, NormalizeClientId(clientId)));
        });

        // Drop a new anonymous spark into the Pool
        pool.MapPost("/{poolCode}/sparks", async (
            string poolCode,
            CreateSparkRequest req,
            ZpovedniceDbContext db,
            SafetyGuardrailService safety) =>
        {
            var code = poolCode.Trim().ToUpperInvariant();
            var entity = await db.GroupPools.FirstOrDefaultAsync(p => p.PoolCode == code);
            if (entity is null) return Results.NotFound(new { error = "Tajný Kruh nenalezen." });

            if (string.IsNullOrWhiteSpace(req.Text) || req.Text.Trim().Length < 10)
                return Results.BadRequest(new { error = "Návrh musí mít alespoň 10 znaků." });

            var safetyCheck = safety.Evaluate(req.Text);
            if (safetyCheck.IsBlocked)
                return Results.BadRequest(new { error = safetyCheck.CrisisHelp!.Message });

            var clientId = NormalizeClientId(req.ClientId);
            var me = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == code && m.ClientId == clientId);
            if (me is null) return Results.BadRequest(new { error = "Nejdřív vstup do Tajného Kruhu s maskou." });

            var spark = new PoolSparkEntity
            {
                PoolCode = code,
                AuthorMemberId = me.Id,
                Text = req.Text.Trim(),
                IntentLevel = string.IsNullOrWhiteSpace(req.IntentLevel) ? entity.HeatMode : req.IntentLevel,
                IsSystemSpark = false,
                Status = "Open"
            };
            db.PoolSparks.Add(spark);
            await db.SaveChangesAsync();

            return Results.Ok(await BuildPoolStateAsync(db, entity, clientId));
        });

        // Cold-start helper: Confessor drops a system icebreaker spark if room is shy
        pool.MapPost("/{poolCode}/sparks/system", async (string poolCode, string clientId, ZpovedniceDbContext db) =>
        {
            var code = poolCode.Trim().ToUpperInvariant();
            var entity = await db.GroupPools.FirstOrDefaultAsync(p => p.PoolCode == code);
            if (entity is null) return Results.NotFound();

            var cid = NormalizeClientId(clientId);
            var me = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == code && m.ClientId == cid);
            if (me is null) return Results.BadRequest(new { error = "Nejsi členem Kruhu." });

            var text = GroupPoolCatalog.SystemIcebreakerSparks[Random.Shared.Next(GroupPoolCatalog.SystemIcebreakerSparks.Length)];
            db.PoolSparks.Add(new PoolSparkEntity
            {
                PoolCode = code,
                AuthorMemberId = me.Id,
                Text = text,
                IntentLevel = entity.HeatMode,
                IsSystemSpark = true,
                Status = "Open"
            });
            await db.SaveChangesAsync();

            return Results.Ok(await BuildPoolStateAsync(db, entity, cid));
        });

        // Catch someone else's spark (costs 1 Golden Match)
        pool.MapPost("/{poolCode}/sparks/{sparkId:guid}/catch", async (
            string poolCode,
            Guid sparkId,
            CatchSparkRequest req,
            ZpovedniceDbContext db,
            SafetyGuardrailService safety) =>
        {
            var code = poolCode.Trim().ToUpperInvariant();
            var entity = await db.GroupPools.FirstOrDefaultAsync(p => p.PoolCode == code);
            if (entity is null) return Results.NotFound();

            var clientId = NormalizeClientId(req.ClientId);
            var me = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == code && m.ClientId == clientId);
            if (me is null) return Results.BadRequest(new { error = "Nejsi v tomto Kruhu." });

            if (me.GoldenMatchesLeft <= 0)
                return Results.BadRequest(new { error = "Došly ti Zlaté sirky (3/3) pro tento večer! Můžeš ale vhodit vlastní návrh." });

            var hasActiveChamber = await db.MaskChambers.AnyAsync(c =>
                c.PoolCode == code && c.Stage < 9 && (c.MemberAId == me.Id || c.MemberBId == me.Id));
            if (hasActiveChamber)
                return Results.BadRequest(new { error = "Už máš otevřenou aktivní Tajnou komnatu. Nejdřív ji dohraj nebo spal." });

            var spark = await db.PoolSparks.FirstOrDefaultAsync(s => s.Id == sparkId && s.PoolCode == code && s.Status == "Open");
            if (spark is null) return Results.NotFound(new { error = "Tato jiskra už není otevřená." });
            if (spark.AuthorMemberId == me.Id)
                return Results.BadRequest(new { error = "Nemůžeš chytit vlastní návrh." });

            var already = await db.PoolSparkCatches.AnyAsync(c => c.SparkId == sparkId && c.CatcherMemberId == me.Id);
            if (already) return Results.BadRequest(new { error = "Tuhle jiskru už jsi chytil/a." });

            var pitch = string.IsNullOrWhiteSpace(req.PitchText)
                ? "Jdu do toho. Uvidíme, jestli mezi námi přeskočí jiskra."
                : req.PitchText.Trim();

            var safetyCheck = safety.Evaluate(pitch);
            if (safetyCheck.IsBlocked) return Results.BadRequest(new { error = safetyCheck.CrisisHelp!.Message });

            me.GoldenMatchesLeft -= 1;
            var catchEntity = new PoolSparkCatchEntity
            {
                SparkId = sparkId,
                CatcherMemberId = me.Id,
                PitchText = pitch,
                Status = "Pending"
            };
            db.PoolSparkCatches.Add(catchEntity);

            // If author is a Demo Bot, immediately accept & open the Mask Chamber so user can play solo right away!
            var author = await db.PoolMembers.FirstOrDefaultAsync(m => m.Id == spark.AuthorMemberId);
            if (author is { IsDemoBot: true })
            {
                spark.Status = "Matched";
                catchEntity.Status = "Selected";
                var chamber = CreateNewChamber(code, spark.Id, author.Id, me.Id);
                // Bot pre-fills Stage 1 chemistry answers so user gets immediate interactive reveal!
                chamber.AnswersAJson = JsonSerializer.Serialize(new ChemistryAnswersDto(
                    "Zmizet spolu po půlnoci, pokud přeskočí jiskra",
                    "Hravé přetahování o kontrolu",
                    "„Hádám, že tvůj pohled už jsem dnes v místnosti zachytil/a…“"
                ));
                chamber.ConsentStage1A = true;
                chamber.SignalASent = true;
                db.MaskChambers.Add(chamber);
            }

            await db.SaveChangesAsync();
            return Results.Ok(await BuildPoolStateAsync(db, entity, clientId));
        });

        // Spark Author selects ONE masked Catcher -> Opens Mask Chamber at Stage 1
        pool.MapPost("/{poolCode}/sparks/{sparkId:guid}/select/{catchId:guid}", async (
            string poolCode,
            Guid sparkId,
            Guid catchId,
            string clientId,
            ZpovedniceDbContext db) =>
        {
            var code = poolCode.Trim().ToUpperInvariant();
            var entity = await db.GroupPools.FirstOrDefaultAsync(p => p.PoolCode == code);
            if (entity is null) return Results.NotFound();

            var cid = NormalizeClientId(clientId);
            var me = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == code && m.ClientId == cid);
            if (me is null) return Results.BadRequest(new { error = "Nejsi členem Kruhu." });

            var spark = await db.PoolSparks.FirstOrDefaultAsync(s => s.Id == sparkId && s.PoolCode == code && s.AuthorMemberId == me.Id);
            if (spark is null || spark.Status != "Open")
                return Results.BadRequest(new { error = "Návrh nelze vybrat." });

            var allCatches = await db.PoolSparkCatches.Where(c => c.SparkId == sparkId).ToListAsync();
            var chosen = allCatches.FirstOrDefault(c => c.Id == catchId);
            if (chosen is null) return Results.NotFound(new { error = "Zájemce nenalezen." });

            // Refund Golden Match to unselected suitors
            foreach (var other in allCatches.Where(c => c.Id != catchId))
            {
                other.Status = "Refunded";
                var otherMember = await db.PoolMembers.FirstOrDefaultAsync(m => m.Id == other.CatcherMemberId);
                if (otherMember is not null) otherMember.GoldenMatchesLeft = Math.Min(3, otherMember.GoldenMatchesLeft + 1);
            }

            chosen.Status = "Selected";
            spark.Status = "Matched";

            var chamber = CreateNewChamber(code, spark.Id, me.Id, chosen.CatcherMemberId);

            // If chosen catcher is a Demo Bot, pre-fill its Stage 1 chemistry answers
            var chosenMember = await db.PoolMembers.FirstOrDefaultAsync(m => m.Id == chosen.CatcherMemberId);
            if (chosenMember is { IsDemoBot: true })
            {
                chamber.AnswersBJson = JsonSerializer.Serialize(new ChemistryAnswersDto(
                    "Polibek v soukromí a pak uvidíme, kam noc zajde",
                    "Nechám se svést a překvapit",
                    "„Tenhle tvůj návrh mi zrychlil tep hned, jak jsem ho přečetl/a.“"
                ));
                chamber.ConsentStage1B = true;
            }

            db.MaskChambers.Add(chamber);
            await db.SaveChangesAsync();

            return Results.Ok(await BuildPoolStateAsync(db, entity, cid));
        });

        // Report inappropriate spark (3 reports auto-burn it)
        pool.MapPost("/{poolCode}/sparks/{sparkId:guid}/report", async (string poolCode, Guid sparkId, ZpovedniceDbContext db) =>
        {
            var spark = await db.PoolSparks.FirstOrDefaultAsync(s => s.Id == sparkId && s.PoolCode == poolCode.Trim().ToUpperInvariant());
            if (spark is null) return Results.NotFound();
            spark.ReportCount += 1;
            if (spark.ReportCount >= 3) spark.Status = "Burned";
            await db.SaveChangesAsync();
            return Results.Ok(new { reported = true, burned = spark.Status == "Burned" });
        });

        // Stage 1: Submit blind Chemistry Trial answers
        pool.MapPost("/chambers/{chamberId:guid}/chemistry", async (
            Guid chamberId,
            SubmitChemistryRequest req,
            ZpovedniceDbContext db,
            SafetyGuardrailService safety) =>
        {
            var chamber = await db.MaskChambers.FirstOrDefaultAsync(c => c.Id == chamberId && c.Stage < 9);
            if (chamber is null) return Results.NotFound(new { error = "Komnata již neexistuje nebo shořela." });

            var safetyCheck = safety.Evaluate(req.WhisperLine);
            if (safetyCheck.IsBlocked) return Results.BadRequest(new { error = safetyCheck.CrisisHelp!.Message });

            var cid = NormalizeClientId(req.ClientId);
            var me = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == chamber.PoolCode && m.ClientId == cid);
            if (me is null) return Results.Forbid();

            var answersJson = JsonSerializer.Serialize(new ChemistryAnswersDto(
                req.FarLimit.Trim(),
                req.DynamicStyle.Trim(),
                string.IsNullOrWhiteSpace(req.WhisperLine) ? "Uvidíme se za chvíli očima…" : req.WhisperLine.Trim()
            ));

            if (chamber.MemberAId == me.Id) chamber.AnswersAJson = answersJson;
            else if (chamber.MemberBId == me.Id) chamber.AnswersBJson = answersJson;
            else return Results.Forbid();

            await db.SaveChangesAsync();

            var poolEntity = await db.GroupPools.FirstAsync(p => p.PoolCode == chamber.PoolCode);
            return Results.Ok(await BuildPoolStateAsync(db, poolEntity, cid));
        });

        // Advance Chamber through Stage 1 Consent -> Stage 2 Signal A -> Stage 3 Signal B -> Stage 4 Rendezvous
        pool.MapPost("/chambers/{chamberId:guid}/advance", async (
            Guid chamberId,
            AdvanceChamberRequest req,
            ZpovedniceDbContext db) =>
        {
            var chamber = await db.MaskChambers.FirstOrDefaultAsync(c => c.Id == chamberId && c.Stage < 9);
            if (chamber is null) return Results.NotFound(new { error = "Tajná komnata už shořela." });

            var cid = NormalizeClientId(req.ClientId);
            var me = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == chamber.PoolCode && m.ClientId == cid);
            if (me is null) return Results.Forbid();

            var isA = chamber.MemberAId == me.Id;
            var isB = chamber.MemberBId == me.Id;
            if (!isA && !isB) return Results.Forbid();

            var otherMember = await db.PoolMembers.FirstOrDefaultAsync(m => m.Id == (isA ? chamber.MemberBId : chamber.MemberAId));
            var otherIsBot = otherMember?.IsDemoBot == true;

            switch (req.Action)
            {
                case "consent_stage1":
                    if (isA) chamber.ConsentStage1A = true;
                    if (isB) chamber.ConsentStage1B = true;
                    if (otherIsBot)
                    {
                        chamber.ConsentStage1A = true;
                        chamber.ConsentStage1B = true;
                    }
                    if (chamber.ConsentStage1A && chamber.ConsentStage1B && chamber.Stage == 1)
                    {
                        chamber.Stage = 2;
                        if (isB && otherIsBot) chamber.SignalASent = true; // Bot A sends signal right away
                    }
                    break;

                case "signal_a_sent":
                    if (isA && chamber.Stage == 2)
                    {
                        chamber.SignalASent = true;
                        if (otherIsBot)
                        {
                            // Demo Bot B immediately confirms spotting A and moves to Stage 3 + sends Signal B!
                            chamber.SignalAConfirmedByB = true;
                            chamber.Stage = 3;
                            chamber.SignalBSent = true;
                        }
                    }
                    break;

                case "signal_a_spotted":
                    if (isB && chamber.Stage == 2 && chamber.SignalASent)
                    {
                        chamber.SignalAConfirmedByB = true;
                        chamber.Stage = 3;
                    }
                    break;

                case "signal_b_sent":
                    if (isB && chamber.Stage == 3)
                    {
                        chamber.SignalBSent = true;
                        if (otherIsBot)
                        {
                            chamber.SignalBConfirmedByA = true;
                            chamber.Stage = 4;
                            var prof = await DesireProfileService.GetOrCreateAsync(db, cid);
                            DesireProfileService.UpdateFromCoupleNight(prof, 94);
                        }
                    }
                    break;

                case "signal_b_spotted":
                    if (isA && chamber.Stage == 3 && chamber.SignalBSent)
                    {
                        chamber.SignalBConfirmedByA = true;
                        chamber.Stage = 4;
                        var prof = await DesireProfileService.GetOrCreateAsync(db, cid);
                        DesireProfileService.UpdateFromCoupleNight(prof, 94);
                    }
                    break;

                case "set_spot":
                    if (chamber.Stage == 4 && !string.IsNullOrWhiteSpace(req.MeetingSpot))
                    {
                        chamber.MeetingSpot = req.MeetingSpot.Trim();
                    }
                    break;
            }

            await db.SaveChangesAsync();
            var poolEntity = await db.GroupPools.FirstAsync(p => p.PoolCode == chamber.PoolCode);
            return Results.Ok(await BuildPoolStateAsync(db, poolEntity, cid));
        });

        // Safe Eject: Burn Mask Chamber at ANY stage (zero trace, zero awkwardness!)
        pool.MapDelete("/chambers/{chamberId:guid}/burn", async (Guid chamberId, string clientId, ZpovedniceDbContext db) =>
        {
            var chamber = await db.MaskChambers.FirstOrDefaultAsync(c => c.Id == chamberId);
            if (chamber is null) return Results.Ok(new { burned = true });

            var poolCode = chamber.PoolCode;
            // Wipe sensitive answers & mark burned so other side gets neutral "Mask dissolved in smoke" message
            chamber.Stage = 9;
            chamber.AnswersAJson = null;
            chamber.AnswersBJson = null;
            await db.SaveChangesAsync();

            var poolEntity = await db.GroupPools.FirstAsync(p => p.PoolCode == poolCode);
            return Results.Ok(await BuildPoolStateAsync(db, poolEntity, NormalizeClientId(clientId)));
        });

        // Pilot Testing Helper: Spawn a Demo Masked Player in the room so 1 person can test the whole 4-stage game!
        pool.MapPost("/{poolCode}/demo-bot", async (string poolCode, string clientId, ZpovedniceDbContext db) =>
        {
            var code = poolCode.Trim().ToUpperInvariant();
            var entity = await db.GroupPools.FirstOrDefaultAsync(p => p.PoolCode == code);
            if (entity is null) return Results.NotFound();

            var cid = NormalizeClientId(clientId);
            var me = await db.PoolMembers.FirstOrDefaultAsync(m => m.PoolCode == code && m.ClientId == cid);
            if (me is null) return Results.BadRequest(new { error = "Nejdřív vstup do Kruhu." });

            var usedNames = await db.PoolMembers.Where(m => m.PoolCode == code).Select(m => m.MaskName).ToListAsync();
            var (maskName, maskSymbol) = GroupPoolCatalog.PickUnusedMask(usedNames);

            var botGender = me.Seeking is "M" or "F" ? me.Seeking : (me.Gender == "M" ? "F" : "M");
            var botSeeking = me.Gender is "M" or "F" ? me.Gender : "Any";

            var bot = new PoolMemberEntity
            {
                PoolCode = code,
                ClientId = $"bot_{Guid.NewGuid():N}"[..20],
                MaskName = maskName,
                MaskSymbol = maskSymbol,
                Gender = botGender,
                Seeking = botSeeking,
                Clue1 = GroupPoolCatalog.CluePresets[Random.Shared.Next(GroupPoolCatalog.CluePresets.Length)],
                GoldenMatchesLeft = 3,
                IsDemoBot = true
            };
            db.PoolMembers.Add(bot);

            // If user already dropped an Open spark, Demo Bot catches it! Otherwise Bot drops a spicy spark for the user!
            var myOpenSpark = await db.PoolSparks.FirstOrDefaultAsync(s =>
                s.PoolCode == code && s.AuthorMemberId == me.Id && s.Status == "Open");

            if (myOpenSpark is not null)
            {
                db.PoolSparkCatches.Add(new PoolSparkCatchEntity
                {
                    SparkId = myOpenSpark.Id,
                    CatcherMemberId = bot.Id,
                    PitchText = "Tohle zní přesně jako důvod, proč dnes nejít spát brzy. Zkusíme Zkoušku signálu?"
                });
            }
            else
            {
                db.PoolSparks.Add(new PoolSparkEntity
                {
                    PoolCode = code,
                    AuthorMemberId = bot.Id,
                    Text = GroupPoolCatalog.QuickSparks[Random.Shared.Next(GroupPoolCatalog.QuickSparks.Length)],
                    IntentLevel = entity.HeatMode,
                    IsSystemSpark = false,
                    Status = "Open"
                });
            }

            await db.SaveChangesAsync();
            return Results.Ok(await BuildPoolStateAsync(db, entity, cid));
        });
    }

    private static MaskChamberEntity CreateNewChamber(string poolCode, Guid sparkId, Guid memberAId, Guid memberBId) =>
        new()
        {
            PoolCode = poolCode,
            SparkId = sparkId,
            MemberAId = memberAId,
            MemberBId = memberBId,
            Stage = 1,
            SignalAText = GroupPoolCatalog.StealthSignalsA[Random.Shared.Next(GroupPoolCatalog.StealthSignalsA.Length)],
            SignalBText = GroupPoolCatalog.StealthSignalsB[Random.Shared.Next(GroupPoolCatalog.StealthSignalsB.Length)],
            Passphrase = GroupPoolCatalog.Passphrases[Random.Shared.Next(GroupPoolCatalog.Passphrases.Length)],
            MeetingSpot = GroupPoolCatalog.MeetingSpots[0],
            Icebreaker = GroupPoolCatalog.Icebreakers[Random.Shared.Next(GroupPoolCatalog.Icebreakers.Length)]
        };

    private static async Task<GroupPoolStateResponse> BuildPoolStateAsync(
        ZpovedniceDbContext db, GroupPoolEntity pool, string clientId)
    {
        var members = await db.PoolMembers.Where(m => m.PoolCode == pool.PoolCode).ToListAsync();
        var memberMap = members.ToDictionary(m => m.Id);
        var me = members.FirstOrDefault(m => m.ClientId == clientId);

        var openSparks = await db.PoolSparks
            .Where(s => s.PoolCode == pool.PoolCode && s.Status == "Open")
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var sparkIds = openSparks.Select(s => s.Id).ToList();
        var catches = sparkIds.Count > 0
            ? await db.PoolSparkCatches.Where(c => sparkIds.Contains(c.SparkId)).ToListAsync()
            : [];

        var allChambers = await db.MaskChambers.Where(c => c.PoolCode == pool.PoolCode).ToListAsync();
        var activeChambersCount = allChambers.Count(c => c.Stage is >= 1 and <= 3);
        var completedRendezvousCount = allChambers.Count(c => c.Stage == 4);

        var sparkDtos = new List<PoolSparkDto>();
        foreach (var s in openSparks)
        {
            if (!memberMap.TryGetValue(s.AuthorMemberId, out var author)) continue;
            var isMine = me is not null && s.AuthorMemberId == me.Id;

            // Silent compatibility filter: hide incompatible sparks from others
            if (!isMine && me is not null && !s.IsSystemSpark
                && !GroupPoolCatalog.AreCompatible(me.Gender, me.Seeking, author.Gender, author.Seeking))
            {
                continue;
            }

            var sparkCatches = catches.Where(c => c.SparkId == s.Id && c.Status == "Pending").ToList();
            var alreadyCaught = me is not null && sparkCatches.Any(c => c.CatcherMemberId == me.Id);

            var incomingForAuthor = isMine
                ? sparkCatches
                    .Where(c => memberMap.ContainsKey(c.CatcherMemberId))
                    .Select(c =>
                    {
                        var catcher = memberMap[c.CatcherMemberId];
                        return new PoolCatchDto(c.Id, catcher.MaskName, catcher.MaskSymbol, c.PitchText, c.Status);
                    })
                    .ToList()
                : [];

            sparkDtos.Add(new PoolSparkDto(
                Id: s.Id,
                AuthorMaskName: s.IsSystemSpark ? "Zpovědník Kruhu" : author.MaskName,
                AuthorMaskSymbol: s.IsSystemSpark ? "🜂" : author.MaskSymbol,
                Text: s.Text,
                IntentLevel: s.IntentLevel,
                IsSystemSpark: s.IsSystemSpark,
                IsMine: isMine,
                AlreadyCaughtByMe: alreadyCaught,
                CatchCount: sparkCatches.Count,
                IncomingCatches: incomingForAuthor,
                CreatedAt: s.CreatedAt
            ));
        }

        MaskChamberDto? activeChamberDto = null;
        var lastChamberBurnedNotice = false;

        if (me is not null)
        {
            var myChamber = allChambers
                .Where(c => c.MemberAId == me.Id || c.MemberBId == me.Id)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefault();

            if (myChamber is { Stage: 9 })
            {
                lastChamberBurnedNotice = true;
            }
            else if (myChamber is not null)
            {
                var isA = myChamber.MemberAId == me.Id;
                var otherId = isA ? myChamber.MemberBId : myChamber.MemberAId;
                var other = memberMap[otherId];
                var spark = await db.PoolSparks.FirstOrDefaultAsync(s => s.Id == myChamber.SparkId);

                var myAnsJson = isA ? myChamber.AnswersAJson : myChamber.AnswersBJson;
                var otherAnsJson = isA ? myChamber.AnswersBJson : myChamber.AnswersAJson;
                var bothAnswered = !string.IsNullOrWhiteSpace(myAnsJson) && !string.IsNullOrWhiteSpace(otherAnsJson);

                string? mySignal = null;
                string? watchHint = null;
                if (myChamber.Stage == 2)
                {
                    if (isA) mySignal = myChamber.SignalAText;
                    else watchHint = myChamber.SignalAText;
                }
                else if (myChamber.Stage == 3)
                {
                    if (!isA) mySignal = myChamber.SignalBText;
                    else watchHint = myChamber.SignalBText;
                }

                activeChamberDto = new MaskChamberDto(
                    Id: myChamber.Id,
                    Stage: myChamber.Stage,
                    MyRole: isA ? "A" : "B",
                    MyMaskName: me.MaskName,
                    MyMaskSymbol: me.MaskSymbol,
                    OtherMaskName: other.MaskName,
                    OtherMaskSymbol: other.MaskSymbol,
                    OtherClue1: bothAnswered ? other.Clue1 : null,
                    SparkText: spark?.Text ?? string.Empty,
                    MyAnswersSubmitted: !string.IsNullOrWhiteSpace(myAnsJson),
                    OtherAnswersSubmitted: !string.IsNullOrWhiteSpace(otherAnsJson),
                    MyAnswers: string.IsNullOrWhiteSpace(myAnsJson) ? null : JsonSerializer.Deserialize<ChemistryAnswersDto>(myAnsJson),
                    OtherAnswers: bothAnswered ? JsonSerializer.Deserialize<ChemistryAnswersDto>(otherAnsJson!) : null,
                    MyConsentStage1: isA ? myChamber.ConsentStage1A : myChamber.ConsentStage1B,
                    OtherConsentStage1: isA ? myChamber.ConsentStage1B : myChamber.ConsentStage1A,
                    MySignalInstruction: mySignal,
                    WatchForSignalHint: watchHint,
                    SignalASent: myChamber.SignalASent,
                    SignalAConfirmedByB: myChamber.SignalAConfirmedByB,
                    SignalBSent: myChamber.SignalBSent,
                    SignalBConfirmedByA: myChamber.SignalBConfirmedByA,
                    Passphrase: myChamber.Stage == 4 ? myChamber.Passphrase : null,
                    MeetingSpot: myChamber.Stage == 4 ? myChamber.MeetingSpot : null,
                    Icebreaker: myChamber.Stage == 4 ? myChamber.Icebreaker : null
                );
            }
        }

        return new GroupPoolStateResponse(
            PoolCode: pool.PoolCode,
            Title: pool.Title,
            HeatMode: pool.HeatMode,
            ExpiresAt: pool.ExpiresAt,
            MemberCount: members.Count,
            OpenSparksCount: openSparks.Count,
            ActiveChambersCount: activeChambersCount,
            CompletedRendezvousCount: completedRendezvousCount,
            Me: me is null ? null : new PoolMemberMeDto(me.Id, me.MaskName, me.MaskSymbol, me.Gender, me.Seeking, me.Clue1, me.GoldenMatchesLeft),
            Sparks: sparkDtos,
            ActiveChamber: activeChamberDto,
            LastChamberBurnedNotice: lastChamberBurnedNotice
        );
    }

    private static string NormalizeClientId(string? raw)
    {
        var id = string.IsNullOrWhiteSpace(raw) ? "anon-guest" : raw.Trim();
        return id.Length > 64 ? id[..64] : id;
    }

    private static string NormalizeGender(string? g) => g?.ToUpperInvariant() switch { "M" => "M", "F" => "F", _ => "X" };
    private static string NormalizeSeeking(string? s) => s?.ToUpperInvariant() switch { "M" => "M", "F" => "F", _ => "Any" };

    private static string GeneratePoolCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var suffix = new string(Enumerable.Range(0, 4).Select(_ => chars[Random.Shared.Next(chars.Length)]).ToArray());
        return $"KRUH-{suffix}";
    }
}
