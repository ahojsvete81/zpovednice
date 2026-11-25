using Microsoft.EntityFrameworkCore;

namespace Zpovednice.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(ZpovedniceDbContext db, ILogger logger)
    {
        await db.Database.EnsureCreatedAsync();

        if (!await db.SinWallEntries.AnyAsync())
        {
            logger.LogInformation("Seeding initial Sin Wall entries into MSSQL ZpovedniceDb...");

            var seedEntries = new List<SinWallEntryEntity>
            {
                new()
                {
                    ConfessionText = "Ve dne vedu tým dvaceti lidí a řeším milionové rozpočty. V noci ale sním jen o tom, aby mi partner zabavil telefon, vzal si šátek a na hodinu mi řekl přesně, co mám dělat.",
                    PersonaName = "Matka představená",
                    SinIndex = 86,
                    Archetype = "Krotitel skryté poslušnosti",
                    Category = "Dominance",
                    ForgivenCount = 142,
                    HellCount = 19,
                    CreatedAt = DateTime.UtcNow.AddHours(-18)
                },
                new()
                {
                    ConfessionText = "Jsme spolu sedm let a pořád ho miluju, ale poslední rok jsem si při sprše začala vymýšlet scénáře, že se potkáme jako úplní cizinci v hotelovém baru v cizím městě.",
                    PersonaName = "Otec Dominik",
                    SinIndex = 74,
                    Archetype = "Noční spiklenec",
                    Category = "Roleplay",
                    ForgivenCount = 218,
                    HellCount = 12,
                    CreatedAt = DateTime.UtcNow.AddHours(-13)
                },
                new()
                {
                    ConfessionText = "Přítelkyni jsem nikdy neřekl, jak moc mě dokáže rozpálit, když mi uprostřed úplně normální rodinné večeře pošeptá do ucha jednu jedinou nevhodnou větu.",
                    PersonaName = "Mefisto",
                    SinIndex = 81,
                    Archetype = "Sběratel zakázaných jisker",
                    Category = "Fantazie",
                    ForgivenCount = 189,
                    HellCount = 27,
                    CreatedAt = DateTime.UtcNow.AddHours(-9)
                },
                new()
                {
                    ConfessionText = "Celý život jsem měla pocit, že říct partnerovi nahlas, co přesně se mi líbí, je trapné nebo sobecké. Poprvé jsem to zkusila napsat sem a ulevilo se mi víc, než jsem čekala.",
                    PersonaName = "Sestra Klára",
                    SinIndex = 58,
                    Archetype = "Smyslný objevitel bez studu",
                    Category = "Otevřenost",
                    ForgivenCount = 310,
                    HellCount = 6,
                    CreatedAt = DateTime.UtcNow.AddHours(-6)
                },
                new()
                {
                    ConfessionText = "V práci máme kolegu s neskutečně hlubokým hlasem. Nikdy bych partnera nepodvedla, ale když ten kolega čte prezentaci, moje fantazie si žije úplně vlastním životem.",
                    PersonaName = "Mefisto",
                    SinIndex = 79,
                    Archetype = "Nevinný anděl s temnou fantazií",
                    Category = "Tabu",
                    ForgivenCount = 164,
                    HellCount = 53,
                    CreatedAt = DateTime.UtcNow.AddHours(-3)
                },
                new()
                {
                    ConfessionText = "Vyzkoušeli jsme včera Párovou zpovědnici po hádce o tom, že už spolu málo trávíme čas. Ukázalo se, že oba tajně toužíme po stejném pomalém večeru při svíčkách a bez mobilů.",
                    PersonaName = "Otec Dominik",
                    SinIndex = 69,
                    Archetype = "Poutník za novou jiskrou",
                    Category = "Párová jiskra",
                    ForgivenCount = 251,
                    HellCount = 8,
                    CreatedAt = DateTime.UtcNow.AddHours(-1)
                }
            };

            db.SinWallEntries.AddRange(seedEntries);
            await db.SaveChangesAsync();
        }
    }
}
