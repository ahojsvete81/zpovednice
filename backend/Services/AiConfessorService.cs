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

    public async Task<SoloAiResult> GenerateSoloAbsolutionAsync(
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
                var liveResult = await CallLiveSoloLlmAsync(apiKey, persona, confessionText, intensity, ct);
                if (liveResult is not null)
                    return liveResult;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Live AI call failed, falling back to crafted Czech demo engine.");
            }
        }

        return GenerateCraftedSoloFallback(persona, confessionText, intensity);
    }

    public async Task<CoupleScenarioDto> GenerateCoupleScenarioAsync(
        PersonaDefinition persona,
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
                var liveScenario = await CallLiveCoupleLlmAsync(
                    apiKey, persona, partnerAConfession, partnerABoundaries, partnerBConfession, partnerBBoundaries, intensity, ct);
                if (liveScenario is not null)
                    return liveScenario;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Live AI couple scenario call failed, falling back to crafted Czech demo engine.");
            }
        }

        return GenerateCraftedCoupleFallback(persona, partnerAConfession, partnerABoundaries, partnerBConfession, partnerBBoundaries, intensity);
    }

    private async Task<SoloAiResult?> CallLiveSoloLlmAsync(
        string apiKey,
        PersonaDefinition persona,
        string confessionText,
        string intensity,
        CancellationToken ct)
    {
        var baseUrl = (configuration["AiConfessor:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/');
        var model = configuration["AiConfessor:Model"] ?? "gpt-4o-mini";

        var intensityNote = intensity switch
        {
            "gentle" => "Úroveň intenzity: Něžná, smyslná, romantická, bez nátlaku.",
            "burning" => "Úroveň intenzity: Odvážná, jiskřivá, pikantní a provokativní (stále vkusná 18+, bez explicitní pornografie).",
            _ => "Úroveň intenzity: Hříšná jiskra — hravá, vzrušující, sebevědomá a smyslná."
        };

        var userPrompt = $$"""
            {{intensityNote}}
            Zpověď uživatele: "{{confessionText}}"

            Vrať POUZE validní JSON (bez markdown bloků) v této struktuře:
            {
              "sinIndex": 78,
              "archetype": "Krátký poutavý český archetyp hříšníka (2–5 slov)",
              "absolutionText": "Odpověď zpovědníka v roli (3–5 vět, vtipná, smyslná, trefná).",
              "penanceTitle": "Poutavý název Pokání (2–5 slov)",
              "penanceDescription": "Konkrétní smyslný úkol/výzva na dnešní večer (2–4 věty, bezpečný a konsenzuální).",
              "penanceTiming": "Kdy a jak dlouho (např. Dnes ve 21:00 • 20 minut)",
              "spiceLabel": "Např. Hříšná jiskra",
              "voiceScript": "Krátká šeptaná verze rozhřešení pro přečtení nahlas (2–3 věty)."
            }
            """;

        var content = await SendChatCompletionAsync(baseUrl, apiKey, model, persona.SystemPrompt, userPrompt, ct);
        if (string.IsNullOrWhiteSpace(content)) return null;

        var parsed = JsonSerializer.Deserialize<LiveSoloJson>(StripCodeFences(content), JsonOptions);
        if (parsed is null || string.IsNullOrWhiteSpace(parsed.AbsolutionText)) return null;

        return new SoloAiResult(
            SinIndex: Math.Clamp(parsed.SinIndex, 25, 99),
            Archetype: parsed.Archetype ?? "Tajemný hříšník",
            AbsolutionText: parsed.AbsolutionText,
            Penance: new PenanceDto(
                parsed.PenanceTitle ?? "Rituál tichého přání",
                parsed.PenanceDescription ?? "Dnes večer si dopřej dvacet minut bez telefonu a napiš jednu fantazii, kterou jsi nikdy nevyslovil/a nahlas.",
                parsed.PenanceTiming ?? "Dnes večer • 20 minut",
                parsed.SpiceLabel ?? MapSpiceLabel(intensity)
            ),
            VoiceScript: parsed.VoiceScript ?? parsed.AbsolutionText,
            UsedLiveAi: true
        );
    }

    private async Task<CoupleScenarioDto?> CallLiveCoupleLlmAsync(
        string apiKey,
        PersonaDefinition persona,
        string partnerAConfession,
        string? partnerABoundaries,
        string partnerBConfession,
        string? partnerBBoundaries,
        string intensity,
        CancellationToken ct)
    {
        var baseUrl = (configuration["AiConfessor:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/');
        var model = configuration["AiConfessor:Model"] ?? "gpt-4o-mini";

        var userPrompt = $$"""
            Jsi prostředník v režimu „Párová zpovědnice“ (Blind Desire Matching).
            PRAVIDLO SOUKROMÍ: Nikdy doslovně necituj ani neodhaluj jednostranné tajemství jednoho partnera, pokud v něm není průnik s druhým! Místo toho najdi společnou smyslnou energii, respektuj hranice obou a vytvoř 3-fázový „Večer rozhřešení“.
            Intenzita: {{intensity}}

            Partner A tajná zpověď: "{{partnerAConfession}}"
            Partner A hranice: "{{partnerABoundaries ?? "žádné speciální"}}"

            Partner B tajná zpověď: "{{partnerBConfession}}"
            Partner B hranice: "{{partnerBBoundaries ?? "žádné speciální"}}"

            Vrať POUZE validní JSON:
            {
              "title": "Název večerního scénáře",
              "sharedSparkSummary": "2–3 věty popisující společnou chemii a průnik jejich tužeb bez prozrazení jednostranných tajemství.",
              "chemistryScore": 89,
              "archetypePair": "Např. Magnetická bouře & Sametová disciplína",
              "confessorIntro": "Úvodní oslovení Zpovědníka pro pár (2–3 věty).",
              "steps": [
                { "stepNumber": 1, "phase": "Naladění", "title": "...", "instruction": "...", "duration": "15 min" },
                { "stepNumber": 2, "phase": "Rituál Pokání", "title": "...", "instruction": "...", "duration": "25 min" },
                { "stepNumber": 3, "phase": "Rozhřešení", "title": "...", "instruction": "...", "duration": "Bez limitu" }
              ],
              "closingAbsolution": "Závěrečná věta Zpovědníka."
            }
            """;

        var content = await SendChatCompletionAsync(baseUrl, apiKey, model, persona.SystemPrompt, userPrompt, ct);
        if (string.IsNullOrWhiteSpace(content)) return null;

        var parsed = JsonSerializer.Deserialize<CoupleScenarioDto>(StripCodeFences(content), JsonOptions);
        if (parsed is null || parsed.Steps is null || parsed.Steps.Count == 0) return null;

        return parsed with { UsedLiveAi = true };
    }

    private async Task<string?> SendChatCompletionAsync(
        string baseUrl, string apiKey, string model, string systemPrompt, string userPrompt, CancellationToken ct)
    {
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
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
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

    private static SoloAiResult GenerateCraftedSoloFallback(
        PersonaDefinition persona, string confessionText, string intensity)
    {
        var lower = confessionText.ToLowerInvariant();
        var theme = DetectTheme(lower);
        var hash = Math.Abs(confessionText.GetHashCode());
        var baseSin = intensity switch
        {
            "gentle" => 52,
            "burning" => 81,
            _ => 68
        };
        var sinIndex = Math.Clamp(baseSin + (hash % 18), 45, 98);
        var spiceLabel = MapSpiceLabel(intensity);

        var (archetype, absolution, penanceTitle, penanceDesc, timing) = (persona.PublicInfo.Id, theme) switch
        {
            ("abatyse", "dominance") => (
                "Krotitel skryté poslušnosti",
                "Konečně jsi našel/našla odvahu to vyslovit nahlas. Ve dne držíš opratě pevně v rukou a v noci toužíš po jediném jasném povelu. To není slabost — to je hlad po čistém odevzdání. Odpouštím ti tvé dosavadní váhání, ale od dnešního večera končí doba tichého čekání.",
                "Dekret jedné hodiny",
                "Dnes večer nastav budík přesně na 60 minut. Jedna osoba dostává absolutní právo rozhodovat o světle, hudbě i rytmu doteků — druhá smí říct jen ‚ano‘ nebo bezpečnostní slovo. Zprávu s pozvánkou pošli dvě hodiny předem: ‚Od 21:00 dnes nevelím já.‘",
                "Dnes ve 21:00 • 60 minut"
            ),
            ("abatyse", _) => (
                "Disciplinovaný hříšník",
                "Zajímavé přiznání. Tolik nevyřčeného napětí a přitom tak málo činů! Máš v sobě oheň, který zbytečně schováváš za slušné vychování. Odpouštím ti tvůj stud, ale jen pod podmínkou, že své dnešní pokání splníš bez jediného zaváhání.",
                "Zkouška zakázaného doteku",
                "Vyber si dnes večer jednu větu z toho, co jsi mi právě svěřil/a, a převeď ji do tří krátkých zpráv, které pošleš s odstupem 30 minut — nebo si v tichu při svíčce zapiš svůj nejodvážnější scénář a nahlas ho přečti. Žádné uhýbání pohledem.",
                "Dnes večer • 30 minut"
            ),
            ("mefisto", "forbidden") => (
                "Sběratel zakázaných jisker",
                "Bravo! Přesně kvůli takovým myšlenkám vůbec existují zamčené dveře a zatažené závěsy. Zakázané ovoce chutná nejlépe právě ve chvíli, kdy si přiznáš, že tě láká — a místo výčitek tu energii přetavíš v čisté charisma. Peklo ti dnes uděluje čestné uznání.",
                "Hra na cizince",
                "Přenes tu jiskru do reality bez zbytečných škod: zahraj si dnes večer (s partnerem nebo jako vlastní svůdný rituál) na někoho úplně cizího. Nové jméno, jiný parfém, setkání ‚náhodou‘ u sklenky vína a pravidlo, že prvních 15 minut se smíte dotýkat jen pohledem.",
                "Dnes večer • 45 minut"
            ),
            ("mefisto", _) => (
                "Alchymista noční rozkoše",
                "A tomuhle říkáš hřích? To je teprve solidní předehra! Největší tragédií moderního světa není příliš mnoho vášně, ale příliš mnoho zmařených večerů u seriálů. Odpouštím ti, že ses držel/a zkrátka — ale dnes v noci to napravíš se stylem.",
                "Sabotáž rutiny",
                "Zruš dnes jeden ‚rozumný‘ večerní plán. Zhasni hlavní světla, pusť pomalý temný playlist a vyber jednu malou věc, kterou normálně neděláš — šátek přes oči, kostku ledu na šíji nebo šeptání detailů přímo do ucha. Kdo se začne smát studem, vymýšlí další krok.",
                "Dnes po 20:30 • 40 minut"
            ),
            ("klara", "routine") => (
                "Hledač ztracené jiskry",
                "Děkuji, že to říkáš tak upřímně. Zvyk dokáže potichu přikrýt i tu nejkrásnější chemii — neznamená to ale, že vyhasla, jen čeká na pozvání bez spěchu a bez tlaku na výkon. Odpouštím ti každý večer, kdy únava vyhrála nad touhou.",
                "Patnáct minut bez cíle",
                "Domluvte si dnes patnáct minut v šeru, kdy je ‚zakázáno‘ spěchat k cíli. Jen pomalý vědomý dotek dlaní na zádech, krku a předloktí, zatímco každý z vás zašeptá jednu věc, která mu zrovna dělá dobře. Žádné telefony, jen dech a zvědavost.",
                "Dnes večer • 15–25 minut"
            ),
            ("klara", _) => (
                "Smyslný objevitel bez studu",
                "Tady můžeš vydechnout. To, po čem toužíš, z tebe nedělá nikoho ‚špatného‘ — ukazuje to jen, že tvé tělo i fantazie jsou živé a chtějí být slyšet. Odpouštím ti všechna zbytečná tabu, která sis v sobě nosil/a.",
                "Rituál pěti smyslů",
                "Vytvoř si dnes večer malý smyslný ostrov: teplá sprcha, oblíbená vůně, tlumené světlo a jedna tajná věta napsaná na papír o tom, co bys chtěl/a zažít v příštích 30 dnech. Pokud máš partnera, vyměňte si papírky při sklence vína.",
                "Dnes večer • 25 minut"
            ),
            (_, "dominance") => (
                "Nevinný anděl s temnou fantazií",
                "Ach, jak sladký paradox. Čím více kontroly držíš přes den, tím hlasitěji tvé tělo v noci prosí o to, aby někdo převzal taktovku. Za mřížkou zpovědnice to slyším častěji, než by sis myslel/a. Hřích je odpuštěn — teď mu dej tvar.",
                "Tichý rozkaz o půl deváté",
                "Pošli dnes večer jedinou krátkou zprávu bez smajlíků: ‚Dnes večer mám jedno přání, za které se trochu stydím. Připrav sklenku a ptej se jen na otázky ano/ne.‘ Nech napětí pracovat dřív, než se vůbec potkáte v jedné místnosti.",
                "Dnes ve 20:30 • 35 minut"
            ),
            (_, "routine") => (
                "Poutník za novou jiskrou",
                "Rutina je nejtišší zloděj rozkoše, ale už tím, že jsi přišel/přišla za mřížku, jsi ji přistihl/a při činu. Vášeň nepotřebuje velká gesta — stačí narušit předvídatelnost jedním nečekaným tahem. Odpouštím ti všechny tiché večery a dávám ti klíč k novému.",
                "Zakázaná zóna doteku",
                "Dnes večer zvolte jednu ‚zakázanou zónu‘, které se nesmíte dotknout prvních dvacet minut — o to pomaleji a pozorněji prozkoumejte všechno kolem ní (šíji, klíční kosti, vnitřní stranu zápěstí). Odepření je nejmocnější koření.",
                "Dnes večer • 30 minut"
            ),
            _ => (
                "Strážce sametového tajemství",
                "Za touto mřížkou padají masky a tvoje přiznání má v sobě víc pravdy a jiskry, než si možná připouštíš. Fantazie není prohřešek — je to kompas toho, kde tě čeká největší živost. Uděluji ti rozhřešení a proměňuji tvůj stud v pozvánku.",
                "Šeptaná zpověď při svíčce",
                "Ztlum dnes večer světla na minimum a věnuj 20 minut jen své touze. Napiš tři klíčová slova, která vystihují to, co tě nejvíc vzrušuje — a jedno z nich dnes skutečně proměň v malý čin, zprávu nebo společný rituál.",
                "Dnes večer • 20 minut"
            )
        };

        var voiceScript = $"{absolution} A teď poslouchej své pokání: {penanceTitle}. {penanceDesc}";

        return new SoloAiResult(
            SinIndex: sinIndex,
            Archetype: archetype,
            AbsolutionText: absolution,
            Penance: new PenanceDto(penanceTitle, penanceDesc, timing, spiceLabel),
            VoiceScript: voiceScript,
            UsedLiveAi: false
        );
    }

    private static CoupleScenarioDto GenerateCraftedCoupleFallback(
        PersonaDefinition persona,
        string partnerAConfession,
        string? partnerABoundaries,
        string partnerBConfession,
        string? partnerBBoundaries,
        string intensity)
    {
        var combined = $"{partnerAConfession} {partnerBConfession}".ToLowerInvariant();
        var boundaries = $"{partnerABoundaries} {partnerBBoundaries}".Trim();

        var hasDominance = combined.Contains("dominan") || combined.Contains("velení") || combined.Contains("posluš") || combined.Contains("sváz") || combined.Contains("šátek");
        var hasRoleplay = combined.Contains("roleplay") || combined.Contains("cizinc") || combined.Contains("hotel") || combined.Contains("hra") || combined.Contains("překvap");
        var hasSensual = combined.Contains("masáž") || combined.Contains("pomalu") || combined.Contains("něž") || combined.Contains("dotek") || combined.Contains("svíčk");

        var chemistry = Math.Clamp(82 + (Math.Abs(combined.GetHashCode()) % 17), 82, 99);

        var (title, spark, pairArchetype, step1, step2, step3) = (hasDominance, hasRoleplay, hasSensual) switch
        {
            (true, _, _) => (
                "Večer Sametového Povelí",
                "Oba v sobě nosíte silnou touhu po napětí mezi vedením a odevzdáním — jeden touží na chvíli pustit kontrolu, druhý cítí chuť převzít iniciativu. Vaše tajné zpovědi se potkaly přesně na hraně hravé důvěry a smyslného napětí.",
                "Tichý velitel × Nespoutaná důvěra",
                new CoupleStepDto(1, "Naladění", "Odevzdání smyslů", "Ztlumte světla a zapalte svíčku. Partner, který dnes přebírá vedení, jemně zakryje druhému oči šátkem (nebo ho požádá, aby oči neotvíral) a na 10 minut zvolí tempo hudby i první tři nečekané doteky.", "15 min"),
                new CoupleStepDto(2, "Rituál Pokání", "Tři šeptané příkazy", "Vedoucí partner smí vyslovit tři smyslné, hravé a plně respektující úkoly (např. pomalý polibek na vybrané místo, vedení rukou, hra s chladem/teplem). Druhý partner odpovídá jen dechem nebo slovem ‚dál‘.", "25 min"),
                new CoupleStepDto(3, "Rozhřešení", "Výměna korun", "Sejměte šátek, podívejte se na sebe bez spěchu a na posledních deset minut si role buď prohoďte, nebo spojte oba rytmy v jeden společný. Řekněte si jednu věc, která vám dnes nejvíc rozbušila srdce.", "Bez limitu")
            ),
            (_, true, _) => (
                "Noční Rendezvous Cizinců",
                "Vaše zpovědi spojuje hlad po novosti, hravosti a vytržení z všedního dne. Oba podvědomě toužíte zažít toho druhého znovu tak, jako byste se potkali úplně poprvé — s jiskrou tajemství a špetkou zakázaného.",
                "Dva spiklenci × Tajemní cizinci",
                new CoupleStepDto(1, "Naladění", "První setkání v přítmí", "Rozdělte se na 10 minut do jiných místností. Každý si vezme detail, ve kterém se cítí neodolatelně, a pošle druhému zprávu jako cizinec: ‚U baru na tebe čekám za pět minut. Poznáš mě podle pohledu.‘", "15 min"),
                new CoupleStepDto(2, "Rituál Pokání", "Hra otázek na hraně", "Při sklence vína se střídejte ve třech otázkách, na které se nesmí lhát — každá další musí být o stupeň smyslnější. Za každou odvážnou odpověď následuje 30 sekund pomalého doteku v tichu.", "25 min"),
                new CoupleStepDto(3, "Rozhřešení", "Konec přetvářky", "Odhoďte cizí jména a nechte napětí, které jste nasbírali, volně rozplynout. Zbytek večera patří jen tomu, co jste si před chvílí pošeptali.", "Bez limitu")
            ),
            _ => (
                "Rituál Pomalého Ohně",
                "Vaše tajná přání mají společného jmenovatele: hlad po skutečné přítomnosti, zpomalení a hlubší smyslnosti bez spěchu. Oba toužíte cítit, že dnes večer existujete jen vy dva.",
                "Sametový magnet × Tichý žár",
                new CoupleStepDto(1, "Naladění", "Mapa dlaní v šeru", "Odložte telefony do jiné místnosti. Na deset minut se jeden položí a druhý pomocí teplého oleje nebo jen pomalých tahů prstů zmapuje šíji, záda a vnitřní stranu paží — beze slov, jen podle rytmu dechu.", "15 min"),
                new CoupleStepDto(2, "Rituál Pokání", "Hra ‚Blíž a dál‘", "Střídejte se v jemném dráždění: vždy po dobu dvou minut se můžete dotýkat všude kromě nejcitlivějších míst. Odepření a zpomalení znásobí každý další dotek.", "25 min"),
                new CoupleStepDto(3, "Rozhřešení", "Jedno tajemství za dotek", "Každý z vás zašeptá druhému do ucha jednu krátkou fantazii pro příští společný večer — a pak nechte dnešní noc dohořet podle vlastního rytmu.", "Bez limitu")
            )
        };

        var boundaryNote = string.IsNullOrWhiteSpace(boundaries)
            ? string.Empty
            : $" Scénář plně respektuje vaše nastavené hranice ({boundaries}).";

        var intro = persona.PublicInfo.Id switch
        {
            "abatyse" => "Vyslechla jsem vás oba za zavřenými dveřmi. Nikomu neprozradím, co přesně řekl ten druhý — ale mohu vám potvrdit jedno: vaše touhy si rozumějí lépe, než si myslíte. Tady je váš dnešní řád.",
            "mefisto" => "Výborně, dva spiklenci pod jednou střechou! Vaše tajné poznámky zůstávají zamčené v trezoru, ale jiskra mezi nimi by dokázala zapálit katedrálu. Tady máte scénář, se kterým nuda nemá šanci.",
            "klara" => "Děkuji za důvěru obou z vás. Každé jednotlivé tajemství zůstává v bezpečí, a já jsem pro vás vybrala přesně to místo, kde se vaše přání něžně a vášnivě potkávají.",
            _ => "Vyslechl jsem obě vaše zpovědi v naprostém tichu. Jednostranná tajemství zůstávají navždy za mřížkou — ale to, co vás spojuje, jsem pro vás sepsal do dnešního Večera rozhřešení."
        };

        return new CoupleScenarioDto(
            Title: title,
            SharedSparkSummary: spark + boundaryNote,
            ChemistryScore: chemistry,
            ArchetypePair: pairArchetype,
            ConfessorIntro: intro,
            Steps: [step1, step2, step3],
            ClosingAbsolution: "Až noc skončí, nezapomeňte tento pokoj spálit v plamenech. Co se šeptalo ve zpovědnici, zůstane jen mezi vámi dvěma.",
            UsedLiveAi: false
        );
    }

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
}
