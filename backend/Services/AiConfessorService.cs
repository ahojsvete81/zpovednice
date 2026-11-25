using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Zpovednice.Api.Models;

namespace Zpovednice.Api.Services;

public record SoloAiResult(
    int SinIndex,
    string Archetype,
    string AbsolutionText,
    PenanceDto Penance,
    string VoiceScript,
    bool UsedLiveAi
);

public record SoloProbeAiResult(
    string MirrorReaction,
    string ProbingQuestion,
    List<string> QuickChoices,
    bool UsedLiveAi
);

public class AiConfessorService(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<AiConfessorService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public bool IsLiveAiConfigured => !string.IsNullOrWhiteSpace(GetApiKey());

    private string? GetApiKey()
    {
        var configured = configuration["AiConfessor:ApiKey"];
        if (!string.IsNullOrWhiteSpace(configured)) return configured;
        return Environment.GetEnvironmentVariable("OPENAI_API_KEY")
               ?? Environment.GetEnvironmentVariable("AI_CONFESSOR_API_KEY");
    }

    // ─── LAYER 2: SOCRATIC DEEP PROBE ───────────────────────────────────────────────
    public async Task<SoloProbeAiResult> GenerateSoloProbeAsync(
        PersonaDefinition persona,
        string confessionText,
        string intensity,
        CancellationToken ct = default)
    {
        var apiKey = GetApiKey();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var userPrompt = $$"""
                    Uživatel právě vyslovil první vrstvu zpovědi: "{{confessionText}}"
                    Intenzita: {{intensity}}.
                    JEŠTĚ NEUDĚLUJ ROZHŘEŠENÍ! Jako {{persona.PublicInfo.Name}} zachyť skrytý psychologický podtext a polož JEDNU ostrou, smyslnou otázku na tělo, která odhalí skutečnou touhu za maskou.
                    Vrať POUZE validní JSON:
                    {
                      "mirrorReaction": "1–2 věty ostré, trefné reakce v roli.",
                      "probingQuestion": "Jedna hluboká otázka na tělo.",
                      "quickChoices": ["Krátká provokativní volba 1", "Krátká provokativní volba 2", "Krátká provokativní volba 3"]
                    }
                    """;

                var content = await SendChatCompletionAsync(apiKey, persona.SystemPrompt, userPrompt, ct);
                if (!string.IsNullOrWhiteSpace(content))
                {
                    var parsed = JsonSerializer.Deserialize<LiveProbeJson>(StripCodeFences(content), JsonOptions);
                    if (parsed is not null && !string.IsNullOrWhiteSpace(parsed.ProbingQuestion) && parsed.QuickChoices?.Count >= 2)
                    {
                        return new SoloProbeAiResult(
                            parsed.MirrorReaction ?? "Slyším tě. Ale to ještě není celá pravda.",
                            parsed.ProbingQuestion,
                            parsed.QuickChoices.Take(3).ToList(),
                            true
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Live AI probe call failed, using crafted Czech probe engine.");
            }
        }

        return GenerateCraftedProbeFallback(persona, confessionText);
    }

    // ─── LAYER 3: DEEP SOLO ABSOLUTION & PENANCE ────────────────────────────────────
    public async Task<SoloAiResult> GenerateSoloAbsolutionAsync(
        PersonaDefinition persona,
        string confessionText,
        string intensity,
        string? probeQuestion = null,
        string? deepAnswer = null,
        string contextMode = "solo",
        CancellationToken ct = default)
    {
        var apiKey = GetApiKey();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var deepPart = string.IsNullOrWhiteSpace(deepAnswer)
                    ? string.Empty
                    : $"\nNa tvou otázku „{probeQuestion}“ uživatel odpověděl do hloubky: „{deepAnswer}“.";

                var modePart = contextMode == "partner"
                    ? "Pokání navrhni tak, aby ho uživatel mohl dnes večer zkusit S PARTNEREM."
                    : "Pokání navrhni tak, aby fungovalo jako smyslný rituál pro jednotlivce (případně jemný krok k partnerovi).";

                var userPrompt = $$"""
                    Intenzita: {{MapSpiceLabel(intensity)}}. {{modePart}}
                    1. vrstva zpovědi: "{{confessionText}}"{{deepPart}}

                    Vrať POUZE validní JSON:
                    {
                      "sinIndex": 82,
                      "archetype": "Poutavý český archetyp (2–5 slov)",
                      "absolutionText": "Hluboké, trefné rozhřešení spojující obě vrstvy (3–5 vět).",
                      "penanceTitle": "Název Pokání (2–5 slov)",
                      "penanceDescription": "Konkrétní smyslný úkol (2–4 věty, bezpečný a konsenzuální).",
                      "penanceTiming": "Kdy a jak dlouho",
                      "spiceLabel": "{{MapSpiceLabel(intensity)}}",
                      "voiceScript": "Šeptaná verze rozhřešení (2–3 věty)."
                    }
                    """;

                var content = await SendChatCompletionAsync(apiKey, persona.SystemPrompt, userPrompt, ct);
                if (!string.IsNullOrWhiteSpace(content))
                {
                    var parsed = JsonSerializer.Deserialize<LiveSoloJson>(StripCodeFences(content), JsonOptions);
                    if (parsed is not null && !string.IsNullOrWhiteSpace(parsed.AbsolutionText))
                    {
                        return new SoloAiResult(
                            Math.Clamp(parsed.SinIndex, 25, 99),
                            parsed.Archetype ?? "Tajemný hříšník",
                            parsed.AbsolutionText,
                            new PenanceDto(
                                parsed.PenanceTitle ?? "Rituál tichého přání",
                                parsed.PenanceDescription ?? "Dnes večer si dopřej dvacet minut v přítmí bez telefonu.",
                                parsed.PenanceTiming ?? "Dnes večer • 20 minut",
                                parsed.SpiceLabel ?? MapSpiceLabel(intensity)
                            ),
                            parsed.VoiceScript ?? parsed.AbsolutionText,
                            true
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Live AI solo call failed, using crafted Czech engine.");
            }
        }

        return GenerateCraftedSoloFallback(persona, confessionText, deepAnswer, intensity, contextMode);
    }

    // ─── COUPLE 2.0: BLIND DESIRE DECK + POLARITY MATCH ─────────────────────────────
    public async Task<CoupleScenarioDto> GenerateCoupleDeckScenarioAsync(
        PersonaDefinition persona,
        Dictionary<string, string> votesA,
        Dictionary<string, string> votesB,
        string intensity,
        CancellationToken ct = default)
    {
        var matches = ComputeDeckMatches(votesA, votesB);
        var matchSummaryForAi = matches.Count > 0
            ? string.Join("; ", matches.Select(m => $"{m.Title} ({m.MatchStrength})"))
            : "Oba partneři preferují něžnou, bezpečnou blízkost a postupné prolomení ledů.";

        var apiKey = GetApiKey();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var userPrompt = $$"""
                    Jsi průvodce Párové zpovědnice v režimu „Tajné karty (Blind Desire Deck)“.
                    Jednostranné karty partnerů byly smazány. Zůstaly JEN jejich vzájemné shody a magnetické polarity:
                    {{matchSummaryForAi}}
                    Intenzita: {{intensity}}.

                    Vytvoř 3-fázový „Večer rozhřešení“ (každý krok má základní instrukci + jemnější variantu gentleVariation + odvážnější variantu boldVariation pro živý režim) a krátkou odpolední jiskru (daytimeSparkMessage).
                    Vrať POUZE validní JSON:
                    {
                      "title": "Název večera",
                      "sharedSparkSummary": "2–3 věty o jejich společné chemii.",
                      "chemistryScore": 92,
                      "archetypePair": "Např. Sametový velitel × Nespoutaná důvěra",
                      "confessorIntro": "Úvodní oslovení Zpovědníka (2–3 věty).",
                      "daytimeSparkMessage": "Krátká tajná zpráva, kterou si mají poslat už odpoledne v 16:00.",
                      "steps": [
                        { "stepNumber": 1, "phase": "Naladění", "title": "...", "instruction": "...", "gentleVariation": "...", "boldVariation": "...", "duration": "15 min", "durationMinutes": 15 },
                        { "stepNumber": 2, "phase": "Rituál Pokání", "title": "...", "instruction": "...", "gentleVariation": "...", "boldVariation": "...", "duration": "25 min", "durationMinutes": 25 },
                        { "stepNumber": 3, "phase": "Rozhřešení", "title": "...", "instruction": "...", "gentleVariation": "...", "boldVariation": "...", "duration": "20 min", "durationMinutes": 20 }
                      ],
                      "closingAbsolution": "Závěrečná věta Zpovědníka."
                    }
                    """;

                var content = await SendChatCompletionAsync(apiKey, persona.SystemPrompt, userPrompt, ct);
                if (!string.IsNullOrWhiteSpace(content))
                {
                    var parsed = JsonSerializer.Deserialize<LiveCoupleJson>(StripCodeFences(content), JsonOptions);
                    if (parsed is not null && parsed.Steps is { Count: >= 2 })
                    {
                        return new CoupleScenarioDto(
                            Title: parsed.Title ?? "Večer Tajných Shod",
                            Mode: "deck",
                            SharedSparkSummary: parsed.SharedSparkSummary ?? matchSummaryForAi,
                            ChemistryScore: Math.Clamp(parsed.ChemistryScore, 78, 99),
                            ArchetypePair: parsed.ArchetypePair ?? "Dva spiklenci × Jedna jiskra",
                            ConfessorIntro: parsed.ConfessorIntro ?? "Vyslechl jsem oba z vás a našel přesně to, kde hoří stejný oheň.",
                            DaytimeSparkMessage: parsed.DaytimeSparkMessage ?? "Dnes večer v 21:00 odkládáme telefony. Zpovědník už pro nás vybral první krok.",
                            MatchedDesires: matches,
                            Steps: parsed.Steps,
                            ClosingAbsolution: parsed.ClosingAbsolution ?? "Až noc skončí, spalte tento pokoj v plamenech.",
                            UsedLiveAi: true
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Live AI couple deck call failed, using crafted Czech deck engine.");
            }
        }

        return GenerateCraftedCoupleDeckFallback(persona, matches, intensity);
    }

    // ─── COUPLE 2.0: FREE CONFESSION & BRAVE HONESTY MODES ──────────────────────────
    public async Task<CoupleScenarioDto> GenerateCoupleScenarioAsync(
        PersonaDefinition persona,
        string mode,
        string partnerAConfession,
        string? partnerABoundaries,
        string partnerBConfession,
        string? partnerBBoundaries,
        string intensity,
        CancellationToken ct = default)
    {
        var apiKey = GetApiKey();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var modeInstruction = mode == "honesty"
                    ? "REŽIM ODVÁŽNÁ UPŘÍMNOST: Partneři svěřili, co jim v intimitě chybí nebo co se bojí říct, aby druhého nezranili. NIKDY nikoho neobviňuj ani necituj výčitky! Přelož skryté potřeby obou do hřejivého, smyslného jazyka touhy a navrhni smířlivý sbližující večer."
                    : "REŽIM TAJNÁ ZPOVĚĎ: Najdi společnou chemii a polaritu bez prozrazení jednostranných tajemství.";

                var userPrompt = $$"""
                    {{modeInstruction}}
                    Intenzita: {{intensity}}.
                    Partner A: "{{partnerAConfession}}" (hranice: {{partnerABoundaries ?? "žádné"}})
                    Partner B: "{{partnerBConfession}}" (hranice: {{partnerBBoundaries ?? "žádné"}})

                    Vrať POUZE validní JSON:
                    {
                      "title": "Název večerního scénáře",
                      "sharedSparkSummary": "2–3 věty popisující společnou jiskru či sblížení bez obviňování.",
                      "chemistryScore": 91,
                      "archetypePair": "Např. Tichý oheň × Hladové srdce",
                      "confessorIntro": "Úvodní oslovení Zpovědníka pro pár.",
                      "daytimeSparkMessage": "Jedna krátká zpráva pro naladění odpoledne.",
                      "steps": [
                        { "stepNumber": 1, "phase": "Naladění", "title": "...", "instruction": "...", "gentleVariation": "...", "boldVariation": "...", "duration": "15 min", "durationMinutes": 15 },
                        { "stepNumber": 2, "phase": "Rituál Pokání", "title": "...", "instruction": "...", "gentleVariation": "...", "boldVariation": "...", "duration": "25 min", "durationMinutes": 25 },
                        { "stepNumber": 3, "phase": "Rozhřešení", "title": "...", "instruction": "...", "gentleVariation": "...", "boldVariation": "...", "duration": "20 min", "durationMinutes": 20 }
                      ],
                      "closingAbsolution": "Závěrečná věta Zpovědníka."
                    }
                    """;

                var content = await SendChatCompletionAsync(apiKey, persona.SystemPrompt, userPrompt, ct);
                if (!string.IsNullOrWhiteSpace(content))
                {
                    var parsed = JsonSerializer.Deserialize<LiveCoupleJson>(StripCodeFences(content), JsonOptions);
                    if (parsed is not null && parsed.Steps is { Count: >= 2 })
                    {
                        return new CoupleScenarioDto(
                            Title: parsed.Title ?? "Večer rozhřešení",
                            Mode: mode,
                            SharedSparkSummary: parsed.SharedSparkSummary ?? string.Empty,
                            ChemistryScore: Math.Clamp(parsed.ChemistryScore, 78, 99),
                            ArchetypePair: parsed.ArchetypePair ?? "Dva hlasy × Jeden rytmus",
                            ConfessorIntro: parsed.ConfessorIntro ?? string.Empty,
                            DaytimeSparkMessage: parsed.DaytimeSparkMessage ?? "Dnes večer si vyhradíme hodinu jen pro sebe. Bez mobilů, jen my dva.",
                            MatchedDesires: [],
                            Steps: parsed.Steps,
                            ClosingAbsolution: parsed.ClosingAbsolution ?? string.Empty,
                            UsedLiveAi: true
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Live AI couple scenario call failed, using crafted Czech engine.");
            }
        }

        return GenerateCraftedCoupleTextFallback(persona, mode, partnerAConfession, partnerABoundaries, partnerBConfession, partnerBBoundaries);
    }

    // ─── POLARITY + EXACT MATCH ENGINE FOR BLIND DESIRE DECK ────────────────────────
    public static List<MatchedDesireDto> ComputeDeckMatches(
        Dictionary<string, string> votesA,
        Dictionary<string, string> votesB)
    {
        var results = new List<MatchedDesireDto>();
        var handledPolarityPairs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        static bool IsOpen(string? vote) => vote is "yes" or "maybe";

        // 1. Check Complementary Polarity Matches FIRST (highest excitement!)
        foreach (var card in CoupleCardCatalog.All.Where(c => c.ComplementaryCardId is not null))
        {
            var compId = card.ComplementaryCardId!;
            var pairKey = string.CompareOrdinal(card.Id, compId) < 0 ? $"{card.Id}:{compId}" : $"{compId}:{card.Id}";
            if (!handledPolarityPairs.Add(pairKey)) continue;

            votesA.TryGetValue(card.Id, out var aPrimary);
            votesB.TryGetValue(compId, out var bComp);

            votesA.TryGetValue(compId, out var aComp);
            votesB.TryGetValue(card.Id, out var bPrimary);

            if ((IsOpen(aPrimary) && IsOpen(bComp)) || (IsOpen(aComp) && IsOpen(bPrimary)))
            {
                var bothStrong = (aPrimary == "yes" && bComp == "yes") || (aComp == "yes" && bPrimary == "yes");
                results.Add(new MatchedDesireDto(
                    Title: card.PolarityLabel ?? $"{card.Title} × Protipól",
                    Kind: "polarity",
                    MatchStrength: bothStrong ? "Magnetická polarita (100 %)" : "Jiskřivá polarita",
                    Description: "Jeden z vás tajně touží vést a druhý se oddat — dokonale se doplňujete bez jediného trapného slova."
                ));
            }
        }

        // 2. Check Symmetric Exact Matches
        foreach (var card in CoupleCardCatalog.All)
        {
            votesA.TryGetValue(card.Id, out var aVote);
            votesB.TryGetValue(card.Id, out var bVote);

            if (IsOpen(aVote) && IsOpen(bVote))
            {
                var strength = (aVote == "yes" && bVote == "yes") ? "Hořící shoda" : "Jemná jiskra";
                results.Add(new MatchedDesireDto(
                    Title: card.Title,
                    Kind: "exact",
                    MatchStrength: strength,
                    Description: card.Prompt
                ));
            }
        }

        return results.Take(6).ToList();
    }

    private async Task<string?> SendChatCompletionAsync(
        string apiKey, string systemPrompt, string userPrompt, CancellationToken ct)
    {
        var baseUrl = (configuration["AiConfessor:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/');
        var model = configuration["AiConfessor:Model"] ?? "gpt-4o-mini";

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = new
        {
            model,
            temperature = 0.85,
            response_format = new { type = "json_object" },
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            }
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
    }

    private static string StripCodeFences(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            if (firstNewline > 0) trimmed = trimmed[(firstNewline + 1)..];
            if (trimmed.EndsWith("```")) trimmed = trimmed[..^3];
        }
        return trimmed.Trim();
    }

    private static string MapSpiceLabel(string intensity) => intensity switch
    {
        "gentle" => "Sametové pohlazení",
        "burning" => "Hořící zpovědnice",
        _ => "Hříšná jiskra"
    };

    // ─── CRAFTED CZECH FALLBACKS (ZERO API KEY REQUIRED) ────────────────────────────
    private static SoloProbeAiResult GenerateCraftedProbeFallback(PersonaDefinition persona, string confessionText)
    {
        var theme = DetectTheme(confessionText.ToLowerInvariant());

        return (persona.PublicInfo.Id, theme) switch
        {
            ("abatyse", "dominance") => new(
                "Zastav se na chvíli. Slyším tvá slova, ale za mřížkou poznám, když si ještě necháváš zadní vrátka.",
                "Pověz mi bez příkras: co tě na té představě pálí víc — ztráta kontroly, nebo pocit, že po tobě někdo natolik touží, že si tě vezme?",
                [
                    "Konečně na hodinu o ničem nerozhodovat",
                    "Cítit nekompromisní touhu a jasný povel",
                    "Chci to vyzkoušet s partnerem, jen nevím jak začít"
                ],
                false
            ),
            ("mefisto", "forbidden") => new(
                "Á, klasické zakázané ovoce! Ale nepředstírejme, že jde jen o tu konkrétní osobu.",
                "Přiznej barvu — co přesně ti to zakázané dává, co doma v poslední době spí?",
                [
                    "Ten pocit, že po mně někdo kouká jako poprvé",
                    "Adrenalin z tajemství a napětí",
                    "Novou verzi sebe sama, která se nestydí"
                ],
                false
            ),
            ("klara", _) => new(
                "Děkuji za první krok — vím, že někdy i napsat tu první větu chce víc odvahy, než se zdá.",
                "Kdyby dnes večer na dvě hodiny zmizel veškerý stud i strach ze ztrapnění, jak by sis přál/a cítit se na konci noci?",
                [
                    "Hloupě uvolněný/á a přijatý/á beze zbytku",
                    "Žádaný/á a naplno v přítomném okamžiku",
                    "Odvážnější — konečně vyslovit, co chci"
                ],
                false
            ),
            _ => new(
                "Slyším tvou první vrstvu. Ale lidé za mřížkou vždycky nejdřív testují vodu, než řeknou, co je skutečně pálí.",
                "Buď ke mně úplně upřímný/á: co je skutečné jádro téhle touhy?",
                [
                    "Chybí mi napětí, překvapení a pocit novosti",
                    "Toužím po jasném vedení nebo hravé dominanci",
                    "Chci víc pomalé smyslnosti a méně spěchu"
                ],
                false
            )
        };
    }

    private static SoloAiResult GenerateCraftedSoloFallback(
        PersonaDefinition persona, string confessionText, string? deepAnswer, string intensity, string contextMode)
    {
        var combined = $"{confessionText} {deepAnswer}".ToLowerInvariant();
        var theme = DetectTheme(combined);
        var hash = Math.Abs(combined.GetHashCode());
        var baseSin = intensity switch { "gentle" => 54, "burning" => 83, _ => 70 };
        var sinIndex = Math.Clamp(baseSin + (hash % 16), 48, 98);
        var spiceLabel = MapSpiceLabel(intensity);
        var forPartner = contextMode == "partner";

        var deepAck = string.IsNullOrWhiteSpace(deepAnswer)
            ? string.Empty
            : $" A to, co jsi dodal/a v druhé vrstvě („{deepAnswer.Trim().TrimEnd('.')}“), odhalilo celé jádro věci.";

        var (archetype, absolution, penanceTitle, penanceDesc, timing) = (persona.PublicInfo.Id, theme) switch
        {
            ("abatyse", "dominance") => (
                "Krotitel skryté poslušnosti",
                $"Výborně — druhá maska je dole.{deepAck} Ve dne nosíš zodpovědnost na ramenou a v noci tvé tělo touží po jasném řádu, kde nemusí nic vymýšlet. Odpouštím ti dosavadní váhání, ale od dneška přecházíme od slov k činům.",
                forPartner ? "Dekret jedné hodiny pro dva" : "Zkouška sametové disciplíny",
                forPartner
                    ? "Pošli partnerovi přesně dvě hodiny předem zprávu: ‚Od 21:00 dnes na hodinu nevelím já. Připrav šátek nebo jedno jasné pravidlo.‘ Nastavte tichý budík na 60 minut a nenechte si do hry sáhnout telefonem."
                    : "Dnes večer si vyhraď 25 minut bez jediného vyrušení. Ztlum světla, napiš na papír tři konkrétní povely, které by tě nejvíc rozpálily, a jeden z nich zítra pošli jako pozvánku do Párové zpovědnice.",
                "Dnes ve 21:00 • 45–60 min"
            ),
            ("mefisto", "forbidden") => (
                "Sběratel zakázaných jisker",
                $"Přesně tak!{deepAck} Zakázané představy nejsou hřích — jsou to sirky, které ti ukazují, kde ti chybí elektřina. Místo abys je hasil/a pocitem viny, ukradni ten žár a přenes ho tam, kde ho můžeš beze zbytku prožít.",
                forPartner ? "Hra na cizince v přítmí" : "Noční alchymie cizince",
                forPartner
                    ? "Dnes večer se na 15 minut rozdělte. Vezměte si detail, který běžně nenosíte, a potkejte se u sklenky jako dva neznámí, kteří se právě sbalili v baru. Prvních deset minut se smíte svádět jen pohledem a šepotem."
                    : "Změň dnes jednu jedinou večerní rutinu: zhasni stropní světlo, použij vůni, kterou nosíš jen výjimečně, a nahraj si (nebo napiš) scénář toho, jak bys dnes svedl/a cizince v hotelovém baru.",
                "Dnes po 20:30 • 35 min"
            ),
            ("klara", _) => (
                "Smyslný objevitel bez studu",
                $"Cítím z tvých slov velkou úlevu.{deepAck} To, po čem toužíš, je naprosto zdravé a krásné — jen potřebovalo bezpečný prostor, kde ho nikdo nezesměšní. Odpouštím ti všechny zbytečné brzdy v hlavě.",
                forPartner ? "Patnáct minut bez cíle" : "Rituál pěti smyslů",
                forPartner
                    ? "Domluvte si dnes večer 20 minut v šeru s jediným pravidlem: žádný spěch k cíli. Střídejte se v pomalém doteku zad, šíje a předloktí a pošeptejte si jednu věc, která vám dělá nejvíc dobře."
                    : "Dopřej si dnes pomalou teplou sprchu v přítmí, oblíbený olej nebo vůni a 15 minut vědomé pozornosti sobě bez mobilu. Na konci si zapiš jedno přání, které si zasloužíš prožít.",
                "Dnes večer • 20 min"
            ),
            _ => (
                "Strážce sametového tajemství",
                $"Teď už mluvíš pravdu bez příkras.{deepAck} Tvoje fantazie je přesný kompas toho, co v tobě chce ožít. Za touto mřížkou jsi v bezpečí — přijmi rozhřešení a proměň dnešní jiskru v malý, ale skutečný zážitek.",
                forPartner ? "Zakázaná zóna doteku" : "Šeptaná zpověď při svíčce",
                forPartner
                    ? "Dnes večer si vyberte jednu ‚zakázanou zónu‘, které se prvních 20 minut nesmíte dotknout — o to pomaleji prozkoumejte všechno kolem ní (šíji, klíční kosti, zápěstí). Odepření znásobí každý dotek."
                    : "Ztlum dnes večer světlo na jedinou svíčku a sepiš tři klíčová slova své největší touhy. Pokud máš partnera, pozvi ho rovnou do Párových Tajných karet — zbytek zařídím za mřížkou já.",
                "Dnes večer • 30 min"
            )
        };

        return new SoloAiResult(
            SinIndex: sinIndex,
            Archetype: archetype,
            AbsolutionText: absolution,
            Penance: new PenanceDto(penanceTitle, penanceDesc, timing, spiceLabel),
            VoiceScript: $"{absolution} A teď tvé pokání: {penanceTitle}. {penanceDesc}",
            UsedLiveAi: false
        );
    }

    private static CoupleScenarioDto GenerateCraftedCoupleDeckFallback(
        PersonaDefinition persona, List<MatchedDesireDto> matches, string intensity)
    {
        var hasPolarity = matches.Any(m => m.Kind == "polarity");
        var hasRoleplay = matches.Any(m => m.Title.Contains("Cizinci", StringComparison.OrdinalIgnoreCase));
        var hasBlindfold = matches.Any(m => m.Title.Contains("tmy", StringComparison.OrdinalIgnoreCase) || m.Title.Contains("šátek", StringComparison.OrdinalIgnoreCase));

        var chemistry = Math.Clamp(80 + (matches.Count * 4), 82, 99);

        var (title, pairArchetype, daytime, steps) = (hasPolarity, hasRoleplay) switch
        {
            (true, _) => (
                "Večer Magnetické Polarity",
                "Sametový velitel × Nespoutaná důvěra",
                "Dnes v 16:30 pošli partnerovi jedinou zprávu: „Zpovědník našel naši shodu. Večer od 21:00 neřeš čas — stačí, když přijdeš s chutí nechat se překvapit.“",
                new List<CoupleStepDto>
                {
                    new(1, "Naladění", "Předání klíče",
                        "Ztlumte světla a zapalte svíčku. Partner, který dnes přebírá vedení, položí druhému dlaně na ramena, podívá se mu 60 sekund mlčky do očí a řekne: ‚Dnes večer jsem tu pro tvou rozkoš, nemusíš o ničem přemýšlet.‘",
                        "Začněte v objetí vsedě na pohovce při sklence vína a jen si pomalu šeptejte, na co se těšíte.",
                        "Zavažte druhému oči šátkem hned na úvod a první 3 minuty ho veďte po místnosti jen lehkým dotekem konečků prstů na šíji.",
                        "15 min", 15),
                    new(2, "Rituál Pokání", hasBlindfold ? "Tři tahy ve tmě" : "Tři šeptané povely",
                        "Vedoucí partner zvolí tři pomalé smyslné tahy — hra s dechem u ucha, pomalý dotek po klíčních kostech a jeden odvážný krok podle vašich zlatých shod. Druhý smí odpovídat jen dechem nebo slovem ‚dál‘.",
                        "Držte pomalé, hřejivé tempo s masážním olejem a ptejte se jemně: ‚Takhle, nebo pomaleji?‘",
                        "Přidejte kontrast kostky ledu a teplého polibku a nechte druhého vždy 20 sekund čekat v tichu, než přijde další dotek.",
                        "25 min", 25),
                    new(3, "Rozhřešení", "Rozplynutí rolí",
                        "Uvolněte pravidla, sejměte šátek a nechte nasbírané napětí volně přejít do zbytku noci. Na závěr si řekněte jedinou větu o tom, co vás dnes nejvíc rozpálilo.",
                        "Zůstaňte v dlouhém pomalém objetí kůže na kůži a podělte se o jeden pocit z dnešního večera.",
                        "Na posledních deset minut si role hravě otočte — ten, kdo se odevzdal, teď udělí jeden jediný závěrečný rozkaz.",
                        "20 min", 20)
                }
            ),
            (_, true) => (
                "Noční Rendezvous Cizinců",
                "Dva spiklenci × Tajemní cizinci",
                "Odpoledne pošli zprávu jako cizinec: „Dnes ve 21:00 u domácího baru. Poznáš mě podle pohledu — a zapomeň moje skutečné jméno.“",
                new List<CoupleStepDto>
                {
                    new(1, "Naladění", "První setkání v přítmí",
                        "Na 10 minut se rozdělte do jiných místností. Vezměte si detail, ve kterém se cítíte přitažlivě, a potkejte se u sklenky jako dva neznámí, kteří se právě spatřili poprvé.",
                        "Začněte hravým úsměvem a představte se novými jmény při oblíbené hudbě.",
                        "Prvních 10 minut se nesmíte dotknout rukama — svádějte se výhradně hlasem, pohledem a blízkostí rtů u ucha.",
                        "15 min", 15),
                    new(2, "Rituál Pokání", "Tři zakázané otázky",
                        "Střídejte se ve třech otázkách, na které se nesmí lhát — každá další o stupeň smyslnější. Za každou odvážnou odpověď následuje minuta pomalého doteku na místě, které si vybere druhý.",
                        "Zůstaňte u otázek o tom, co vás na tom druhém dodnes nejvíc přitahuje.",
                        "Poslední otázka musí končit slovy: ‚A co chceš, abych s tebou udělal/a právě teď?‘",
                        "25 min", 25),
                    new(3, "Rozhřešení", "Konec přetvářky",
                        "Odhoďte cizí jména a nechte všechny společné zlaté karty z dnešního balíčku proměnit v realitu.",
                        "Přesuňte se pomalu do ložnice jen při světle svíčky bez jediného dalšího slova.",
                        "Přeneste napětí hned tam, kde jste — žádný přesun do ‚správné‘ místnosti není nutný.",
                        "20 min", 20)
                }
            ),
            _ => (
                "Rituál Pomalého Ohně",
                "Sametový magnet × Tichý žár",
                "V 17:00 pošli krátkou zprávu: „Dnes večer patří jen nám. Telefony zůstávají za dveřmi a Zpovědník už nám nachystal tři kroky.“",
                new List<CoupleStepDto>
                {
                    new(1, "Naladění", "Dvě minuty bez uhnutí",
                        "Vypněte obrazovky, zapalte svíčku a posaďte se proti sobě. Dvě minuty se držte za ruce a jen si v tichu hleďte do očí — bez smíchu a bez spěchu.",
                        "Posaďte se těsně vedle sebe a nechte jednu minutu mluvit jen svůj dech.",
                        "Při pohledu do očí si střídavě zašeptejte jednu jedinou věc, kterou chcete dnes zažít.",
                        "12 min", 12),
                    new(2, "Rituál Pokání", "Zakázaná zóna & pomalé dlaně",
                        "Střídejte se po deseti minutách v pomalém mapování těla teplými dlaněmi nebo olejem. Prvních 15 minut se schválně vyhýbejte nejcitlivějším místům — odepření roznítí dvojnásobný žár.",
                        "Soustřeďte se na dlouhé, klidné tahy po zádech, šíji a ramenou.",
                        "Přidejte šeptaný popis toho, co se chystáte udělat jako další krok, ještě dřív než se dotknete.",
                        "25 min", 25),
                    new(3, "Rozhřešení", "Jedno tajemství za polibek",
                        "Když je napětí na vrcholu, každý zašeptá druhému jednu krátkou fantazii pro příští společný večer — a zbytek noci už patří jen vašemu vlastnímu rytmu.",
                        "Nechte večer jemně plynout bez časovače a bez očekávání.",
                        "Proměňte jednu z dnešních zlatých shod hned teď, bez jediného odkladu.",
                        "20 min", 20)
                }
            )
        };

        var sparkSummary = matches.Count > 0
            ? $"Našli jsme {matches.Count} vzájemných shod (včetně {(hasPolarity ? "magnetické polarity!" : "silné smyslné rezonance")}). Všechny jednostranné karty zůstaly navždy za mřížkou a byly smazány."
            : "Oba jste dnes volili opatrně — a přesně proto jsem pro vás sestavil hřejivý, bezpečný rituál, který jemně rozpustí stud a otevře dveře hlubší blízkosti.";

        return new CoupleScenarioDto(
            Title: title,
            Mode: "deck",
            SharedSparkSummary: sparkSummary,
            ChemistryScore: chemistry,
            ArchetypePair: pairArchetype,
            ConfessorIntro: BuildCoupleIntro(persona, "deck"),
            DaytimeSparkMessage: daytime,
            MatchedDesires: matches,
            Steps: steps,
            ClosingAbsolution: "Až noc skončí, nezapomeňte tento pokoj spálit v plamenech. Co se šeptalo ve zpovědnici, zůstane jen mezi vámi dvěma.",
            UsedLiveAi: false
        );
    }

    private static CoupleScenarioDto GenerateCraftedCoupleTextFallback(
        PersonaDefinition persona,
        string mode,
        string partnerAConfession,
        string? partnerABoundaries,
        string partnerBConfession,
        string? partnerBBoundaries)
    {
        var combined = $"{partnerAConfession} {partnerBConfession}".ToLowerInvariant();
        var boundaries = $"{partnerABoundaries} {partnerBBoundaries}".Trim();
        var chemistry = Math.Clamp(85 + (Math.Abs(combined.GetHashCode()) % 14), 85, 98);

        if (mode == "honesty")
        {
            return new CoupleScenarioDto(
                Title: "Rituál Odvážné Blízkosti",
                Mode: "honesty",
                SharedSparkSummary: "Pod všemi nevyslovenými obavami a únavou z všedních dnů máte oba úplně stejné přání: cítit se znovu žádaný/á, viděný/á a v bezpečí bez nutnosti se obhajovat. Přeložil jsem vaše tichá přání do společného mostu zpět k sobě.",
                ChemistryScore: chemistry,
                ArchetypePair: "Dvě otevřená srdce × Nový začátek",
                ConfessorIntro: "Děkuji za mimořádnou odvahu obou z vás. Žádné výčitky ani citlivé věty jsem druhému nepředal — vzal jsem z nich jen čistou touhu po blízkosti, kterou oba sdílíte.",
                DaytimeSparkMessage: "Pošli dnes partnerovi: „Děkuju, že jsi do toho se mnou šel/šla. Večer nic neřešíme a nic si nevyčítáme — jen si na půl hodiny budeme blízko.“",
                MatchedDesires:
                [
                    new("Touha po plné přítomnosti", "exact", "Hluboký soulad", "Oba toužíte po večeru bez spěchu, telefonů a každodenních povinností."),
                    new("Bezpečí bez hodnocení", "exact", "Zlatý most", "Oba potřebujete cítit, že můžete ukázat i zranitelnost, a přesto být přitažliví.")
                ],
                Steps:
                [
                    new(1, "Sblížení", "Reset v objetí",
                        "Postavte se proti sobě v šeru a obejměte se na celé dvě minuty bez jediného slova. Dýchejte do stejného rytmu, dokud z ramen nespadne napětí posledních týdnů.",
                        "Sedněte si vedle sebe, opřete se o sebe zády nebo rameny a jen společně vydechněte.",
                        "Při objetí položte jeden druhému dlaň na zátylek a pomalu vnímejte tlukot srdce.",
                        "10 min", 10),
                    new(2, "Jazyk touhy", "Tři věty začínající ‚Miluju, když…‘",
                        "Místo mluvení o tom, co chybí, řekne každý tři krátké věty začínající slovy ‚Miluju, když se mě dotýkáš…‘ nebo ‚Rozpaluje mě, když…‘. Druhý jen naslouchá a poděkuje polibkem.",
                        "Řekněte si jen jednu jedinou něžnou větu a nechte ji v tichu doznít.",
                        "Ke každé větě hned přidejte 30sekundovou ukázku přesně toho doteku.",
                        "20 min", 20),
                    new(3, "Nová jiskra", "Pomalý dotek beze spěchu",
                        "Věnujte dalších dvacet minut pomalému znovupoznávání bez jakéhokoliv tlaku na výkon. Jen zvědavost, teplo dlaní a radost z toho, že jste zase na jedné lodi.",
                        "Zůstaňte jen u dlouhé masáže a polibků na šíji a ramena.",
                        "Nechte pomalý dotek přirozeně nabrat na žáru podle toho, jak oba reagujete.",
                        "20 min", 20)
                ],
                ClosingAbsolution: "Právě jste překročili nejtěžší hranici každého vztahu — promluvili jste beze strachu. Teď tuhle místnost spalte a nechte minulost v popelu.",
                UsedLiveAi: false
            );
        }

        // Standard Couple Text Confession fallback (upgraded with variations + daytime spark)
        var boundaryNote = string.IsNullOrWhiteSpace(boundaries)
            ? string.Empty
            : $" Scénář plně respektuje vaše nastavené hranice ({boundaries}).";

        var deckFallback = GenerateCraftedCoupleDeckFallback(
            persona,
            [new("Společná noční jiskra", "exact", "Hořící shoda", "Vaše tajné zpovědi rezonují silnou chutí po novosti a společném napětí.")],
            "spicy");

        return deckFallback with
        {
            Mode = "confession",
            ChemistryScore = chemistry,
            SharedSparkSummary = "Vaše tajná přání se potkala na společné vlně zvědavosti, smyslnosti a touhy vytrhnout se z běžného dne." + boundaryNote,
            ConfessorIntro = BuildCoupleIntro(persona, "confession")
        };
    }

    private static string BuildCoupleIntro(PersonaDefinition persona, string mode) => persona.PublicInfo.Id switch
    {
        "abatyse" => "Vyslechla jsem vás oba za zavřenými dveřmi. Jednostranná tajemství byla spálena — ale to, kde se vaše touhy protnuly, stojí za dnešní disciplinovaný večer.",
        "mefisto" => "Dva spiklenci pod jednou střechou! Jednostranné karty zmizely v pekle, zato vaše shody by dokázaly rozpálit ledovec. Tady máte dnešní scénář.",
        "klara" => "Děkuji za důvěru obou z vás. Každé jednotlivé tajemství zůstalo v naprostém bezpečí a já jsem vybrala přesně ta místa, kde se vaše srdce i těla potkávají.",
        _ => mode == "deck"
            ? "Prošel jsem vaše tajné karty v naprostém tichu. Vše, na čem jste se neshodli, zmizelo beze stopy — a z vašich zlatých shod jsem sepsal dnešní Večer rozhřešení."
            : "Vyslechl jsem obě vaše zpovědi za mřížkou. Jednostranná tajemství zůstávají navždy skryta — ale to, co vás spojuje, jsem proměnil v dnešní rituál."
    };

    private static string DetectTheme(string lower)
    {
        if (lower.Contains("dominan") || lower.Contains("velení") || lower.Contains("ovlád") || lower.Contains("posluš") || lower.Contains("sváz") || lower.Contains("přikaz"))
            return "dominance";
        if (lower.Contains("koleg") || lower.Contains("cizí") || lower.Contains("zakázan") || lower.Contains("nevěr") || lower.Contains("ex") || lower.Contains("tajně"))
            return "forbidden";
        if (lower.Contains("rutin") || lower.Contains("nuda") || lower.Contains("dlouho") || lower.Contains("manžel") || lower.Contains("jiskr") || lower.Contains("oživit"))
            return "routine";
        return "general";
    }

    private sealed class LiveProbeJson
    {
        public string? MirrorReaction { get; set; }
        public string? ProbingQuestion { get; set; }
        public List<string>? QuickChoices { get; set; }
    }

    private sealed class LiveSoloJson
    {
        public int SinIndex { get; set; }
        public string? Archetype { get; set; }
        public string? AbsolutionText { get; set; }
        public string? PenanceTitle { get; set; }
        public string? PenanceDescription { get; set; }
        public string? PenanceTiming { get; set; }
        public string? SpiceLabel { get; set; }
        public string? VoiceScript { get; set; }
    }

    private sealed class LiveCoupleJson
    {
        public string? Title { get; set; }
        public string? SharedSparkSummary { get; set; }
        public int ChemistryScore { get; set; }
        public string? ArchetypePair { get; set; }
        public string? ConfessorIntro { get; set; }
        public string? DaytimeSparkMessage { get; set; }
        public List<CoupleStepDto>? Steps { get; set; }
        public string? ClosingAbsolution { get; set; }
    }
}
