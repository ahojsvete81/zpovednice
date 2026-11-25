using Microsoft.EntityFrameworkCore;
using Zpovednice.Api.Data;
using Zpovednice.Api.Models;

namespace Zpovednice.Api.Services;

public static class DesireProfileService
{
    public static async Task<DesireProfileEntity> GetOrCreateAsync(ZpovedniceDbContext db, string? rawClientId)
    {
        var clientId = string.IsNullOrWhiteSpace(rawClientId) ? "anon-guest" : rawClientId.Trim();
        if (clientId.Length > 64) clientId = clientId[..64];

        var profile = await db.DesireProfiles.FirstOrDefaultAsync(p => p.ClientId == clientId);
        if (profile is null)
        {
            profile = new DesireProfileEntity { ClientId = clientId };
            db.DesireProfiles.Add(profile);
            await db.SaveChangesAsync();
        }
        return profile;
    }

    public static void UpdateFromSoloConfession(
        DesireProfileEntity profile,
        string confessionText,
        string? deepAnswer,
        string personaId,
        string intensity,
        string archetype,
        string penanceTitle)
    {
        var combined = $"{confessionText} {deepAnswer}".ToLowerInvariant();

        // Dominance (0 = Odevzdání, 100 = Vedení)
        if (combined.Contains("velení") || combined.Contains("převzít") || combined.Contains("přikaz") || combined.Contains("vést"))
            profile.DominanceAxis = Clamp(profile.DominanceAxis + 9);
        else if (combined.Contains("odevzd") || combined.Contains("posluš") || combined.Contains("pustit kontrol") || combined.Contains("sváz"))
            profile.DominanceAxis = Clamp(profile.DominanceAxis - 10);

        // Taboo (0 = Bezpečí, 100 = Tabu)
        if (combined.Contains("zakázan") || combined.Contains("cizinc") || combined.Contains("koleg") || combined.Contains("tajně") || personaId == "mefisto")
            profile.TabooAxis = Clamp(profile.TabooAxis + 10);
        else if (personaId == "klara" || combined.Contains("bezpeč") || combined.Contains("něžn"))
            profile.TabooAxis = Clamp(profile.TabooAxis - 5);

        // Mind vs Body (0 = Tělo/Dotek, 100 = Mysl/Slovo)
        if (combined.Contains("hlas") || combined.Contains("slov") || combined.Contains("zpráv") || combined.Contains("fantaz") || combined.Contains("představ"))
            profile.MindBodyAxis = Clamp(profile.MindBodyAxis + 8);
        else if (combined.Contains("masáž") || combined.Contains("dotek") || combined.Contains("těl") || combined.Contains("olej"))
            profile.MindBodyAxis = Clamp(profile.MindBodyAxis - 8);

        // Ritual vs Impulse (0 = Impulz, 100 = Rituál)
        if (combined.Contains("svíč") || combined.Contains("pomal") || combined.Contains("večer") || combined.Contains("scénář") || combined.Contains("šátek"))
            profile.RitualAxis = Clamp(profile.RitualAxis + 8);
        else if (combined.Contains("hned") || combined.Contains("nečekan") || combined.Contains("překvap"))
            profile.RitualAxis = Clamp(profile.RitualAxis - 7);

        // Intensity (0 = Hravý flirt, 100 = Temný žár)
        profile.IntensityAxis = intensity switch
        {
            "burning" => Clamp(profile.IntensityAxis + 12),
            "gentle" => Clamp(profile.IntensityAxis - 6),
            _ => Clamp(profile.IntensityAxis + 5)
        };

        // Openness rises with every deep confession
        profile.OpennessAxis = Clamp(profile.OpennessAxis + (string.IsNullOrWhiteSpace(deepAnswer) ? 5 : 10));
        profile.CompletedConfessions += 1;
        profile.PrimaryArchetype = archetype;
        profile.LastPenanceTitle = penanceTitle;
        profile.UpdatedAt = DateTime.UtcNow;
    }

    public static void UpdateFromPenanceFeedback(DesireProfileEntity profile, string penanceTitle, string feedback)
    {
        profile.CompletedPenances += 1;
        profile.LastPenanceTitle = penanceTitle;
        profile.LastPenanceFeedback = feedback;
        profile.OpennessAxis = Clamp(profile.OpennessAxis + 8);

        if (feedback == "bolder")
        {
            profile.IntensityAxis = Clamp(profile.IntensityAxis + 10);
            profile.TabooAxis = Clamp(profile.TabooAxis + 7);
        }
        else if (feedback == "gentler")
        {
            profile.IntensityAxis = Clamp(profile.IntensityAxis - 6);
            profile.RitualAxis = Clamp(profile.RitualAxis + 7);
        }
        else
        {
            profile.RitualAxis = Clamp(profile.RitualAxis + 5);
        }

        profile.UpdatedAt = DateTime.UtcNow;
    }

    public static void UpdateFromCoupleNight(DesireProfileEntity profile, int chemistryScore)
    {
        profile.CompletedCoupleNights += 1;
        profile.OpennessAxis = Clamp(profile.OpennessAxis + 9);
        profile.RitualAxis = Clamp(profile.RitualAxis + 6);
        if (chemistryScore >= 88)
            profile.IntensityAxis = Clamp(profile.IntensityAxis + 6);
        profile.UpdatedAt = DateTime.UtcNow;
    }

    public static DesireProfileDto ToDto(DesireProfileEntity p)
    {
        var actions = p.CompletedConfessions + (p.CompletedPenances * 2) + (p.CompletedCoupleNights * 2);
        var level = actions switch
        {
            0 => 1,
            <= 2 => 2,
            <= 5 => 3,
            <= 9 => 4,
            _ => 5
        };
        var revealPercent = Math.Clamp(18 + (actions * 14), 18, 100);

        var (portrait, blindSpot) = BuildInsights(p);

        return new DesireProfileDto(
            ClientId: p.ClientId,
            DominanceAxis: p.DominanceAxis,
            TabooAxis: p.TabooAxis,
            MindBodyAxis: p.MindBodyAxis,
            RitualAxis: p.RitualAxis,
            IntensityAxis: p.IntensityAxis,
            OpennessAxis: p.OpennessAxis,
            CompletedConfessions: p.CompletedConfessions,
            CompletedPenances: p.CompletedPenances,
            CompletedCoupleNights: p.CompletedCoupleNights,
            InitiationLevel: level,
            RevealPercent: revealPercent,
            PrimaryArchetype: p.PrimaryArchetype,
            PortraitSummary: portrait,
            BlindSpotInsight: blindSpot,
            LastPenanceTitle: p.LastPenanceTitle
        );
    }

    private static (string Portrait, string BlindSpot) BuildInsights(DesireProfileEntity p)
    {
        if (p.CompletedConfessions == 0 && p.CompletedCoupleNights == 0)
        {
            return (
                "Tvůj Atlas touhy se teprve probouzí. Po prvním večeru v Tajném Kruhu nebo Párové zpovědnici se začne kreslit tvá skutečná pečeť.",
                "Zatím držíš masku pevně na obličeji. Zkus Tajný Kruh na párty nebo Párové Tajné karty — první jiskra přeskočí během dvou minut."
            );
        }

        var domPhrase = p.DominanceAxis >= 60
            ? "Přitahuje tě role tichého stratéga, který udává směr a užívá si reakci druhého."
            : p.DominanceAxis <= 40
                ? "Největší úlevu a žár prožíváš ve chvíli, kdy můžeš konečně pustit kontrolu a nechat se vést."
                : "Baví tě pružná hra rolí — podle nálady dokážeš vést i odevzdat taktovku.";

        var mindPhrase = p.MindBodyAxis >= 58
            ? "Tvoje vzrušení začíná v hlavě: hlas, napětí mezi řádky a zpráva odpoledne na tebe působí silněji než spěch."
            : "Potřebuješ skutečný smyslový prožitek — pomalé dlaně, vůni, teplo a přítomnost bez řečí kolem.";

        var blindSpot = p.OpennessAxis < 60
            ? "Tvé slepé místo: Často si své nejlepší fantazie necháváš jen pro sebe ze strachu, jak budou znít nahlas. Přitom právě Párový Blind Deck dokáže tuhle brzdu bezpečně uvolnit."
            : p.TabooAxis >= 65
                ? "Tvé slepé místo: Miluješ jiskru zakázaného, ale občas zapomínáš, že i obyčejný pomalý dotek beze spěchu dokáže vyvolat stejné chvění."
                : "Tvé slepé místo: Máš odvahu objevovat — teď je ideální čas přenést jeden nápad z hlavy do reálného 3-fázového večera.";

        return ($"{domPhrase} {mindPhrase}", blindSpot);
    }

    private static int Clamp(int val) => Math.Clamp(val, 10, 96);
}
