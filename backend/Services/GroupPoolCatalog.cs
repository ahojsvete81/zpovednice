namespace Zpovednice.Api.Services;

public static class GroupPoolCatalog
{
    public static readonly (string Name, string Symbol)[] Masks =
    [
        ("Rudý Fénix", "🜂"),
        ("Černý Havran", "🦅"),
        ("Sametová Liška", "🦊"),
        ("Zlatý Had", "🐍"),
        ("Stříbrný Vlk", "🐺"),
        ("Karmínová Kočka", "🐈‍⬛"),
        ("Měsíční Sova", "🦉"),
        ("Temný Rytíř", "⚔"),
        ("Jantarová Siréna", "✦"),
        ("Obsidiánový Král", "♛"),
        ("Šarlatová Dáma", "⚜"),
        ("Noční Můra", "☾"),
        ("Smaragdový Pardál", "🐆"),
        ("Půlnoční Mág", "✧"),
        ("Zlatá Vážka", "❖"),
        ("Krvavá Růže", "🥀"),
        ("Tichý Stín", "◈"),
        ("Ohnivý Salamandr", "🔥"),
        ("Korunní Drak", "🐉"),
        ("Sametový Lev", "🦁"),
        ("Purpurový Páv", "🪶"),
        ("Ledová Labuť", "🦢"),
        ("Bronzový Sokol", "🦅"),
        ("Tajemný Alchymista", "⚗")
    ];

    public static readonly string[] CluePresets =
    [
        "Mám dnes na sobě něco černého",
        "Držím v ruce víno nebo drink",
        "Známe se méně než 3 roky",
        "Už jsme se dnes alespoň jednou podívali do očí",
        "Mám na těle tetování, které teď není vidět",
        "Dnes spíš poslouchám, než mluvím"
    ];

    public static readonly string[] QuickSparks =
    [
        "Někdo v téhle místnosti má pohled, ze kterého mám husí kůži. Kdo si troufne na 15 minut zmizet na vzduch?",
        "Mám chuť na zakázaný polibek ještě před druhou ráno — bez drbů zítra u snídaně. Kdo chytí tuhle kartu?",
        "Hledám spiklence na dnešní noc. Podmínka: umíš mlčet, máš v sobě jiskru a baví tě pomalá hra.",
        "Přitahuje mě tu jeden člověk a nemám odvahu přijít napřímo. Zkusme Zkoušku signálu v místnosti!",
        "Nechci dnes končit večer o samotě u mobilu. Pokud mezi námi přeskočí jiskra, zmizíme spolu beze slov."
    ];

    public static readonly string[] SystemIcebreakerSparks =
    [
        "🔥 Zpovědník provokuje místnost: Kdo by se tady dnes nechal svést dřív, než skončí noc? Kdo chytne tuhle kartu, hraje o tajné setkání!",
        "🔥 Půlnoční výzva Kruhu: Někdo v téhle partě po někom tajně pokukuje už celý večer. Odvaž se chytit sirku a zjisti, jestli jiskra hoří na obou stranách!"
    ];

    public static readonly string[] StealthSignalsA =
    [
        "Během příštích 2 minut se napij, na 3 vteřiny si prsty sáhni na šíji/krk a pomalu se rozhlédni po místnosti.",
        "Postav se na pár vteřin (třeba pro pití nebo k oknu), prohrábni si vlasy a na moment se usměj do prostoru.",
        "Polož na 5 vteřin mobil displejem dolů, opři se a pomalu očima přejdi celou místnost zleva doprava."
    ];

    public static readonly string[] StealthSignalsB =
    [
        "Zvedni sklenku, přidrž ji na vteřinu u rtů bez napití a pomalu se rozhlédni směrem k ostatním.",
        "Na 3 vteřiny si uprav rukáv nebo zápěstí (hodinky/šperk) a pak se na okamžik podívej přímo na osobu, jejíž signál jsi před chvílí zachytil/a.",
        "Na chvíli vstaň, protáhni ramena a pomalu projdi kolem baru nebo středu místnosti s lehkým úsměvem."
    ];

    public static readonly string[] Passphrases =
    [
        "„Máš pro mě ten ztracený odpustek?“",
        "„Prý tu někdo hledá oheň pro Mefista…“",
        "„Zpovědník říkal, že ti dlužím sklenku.“",
        "„Maska dolů — teď už hrajeme naostro.“"
    ];

    public static readonly string[] MeetingSpots =
    [
        "Za 5 minut venku na terase / na vzduchu",
        "Za 5 minut u baru / v kuchyňce",
        "Za 5 minut na chodbě u schodiště",
        "Za 10 minut — potkáme se pohledem a odejdeme spolu"
    ];

    public static readonly string[] Icebreakers =
    [
        "Žádné řeči o práci ani o ostatních v místnosti. Prvních 10 sekund jen tichý pohled do očí — a pak vede ten, kdo hodil jiskru.",
        "První věta nesmí být ‚tak čau‘. Řekněte si tajné heslo a hned si pošeptejte, co vás na tom druhém rozpálilo při signálu.",
        "Kdo se první začne stydět a uhne pohledem, dluží druhému první polibek nebo smělý tah."
    ];

    public static (string Name, string Symbol) PickUnusedMask(IEnumerable<string> usedNames)
    {
        var used = new HashSet<string>(usedNames, StringComparer.OrdinalIgnoreCase);
        var available = Masks.Where(m => !used.Contains(m.Name)).ToList();
        if (available.Count > 0)
            return available[Random.Shared.Next(available.Count)];
        var baseMask = Masks[Random.Shared.Next(Masks.Length)];
        return ($"{baseMask.Name} #{Random.Shared.Next(10, 99)}", baseMask.Symbol);
    }

    public static bool AreCompatible(string genderA, string seekingA, string genderB, string seekingB)
    {
        var aLikesB = seekingA.Equals("Any", StringComparison.OrdinalIgnoreCase)
                      || genderB.Equals("X", StringComparison.OrdinalIgnoreCase)
                      || seekingA.Equals(genderB, StringComparison.OrdinalIgnoreCase);

        var bLikesA = seekingB.Equals("Any", StringComparison.OrdinalIgnoreCase)
                      || genderA.Equals("X", StringComparison.OrdinalIgnoreCase)
                      || seekingB.Equals(genderA, StringComparison.OrdinalIgnoreCase);

        return aLikesB && bLikesA;
    }
}
