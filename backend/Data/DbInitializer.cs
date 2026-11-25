using Microsoft.EntityFrameworkCore;

namespace Zpovednice.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(ZpovedniceDbContext db, ILogger logger)
    {
        await db.Database.EnsureCreatedAsync();

        // Idempotent schema upgrade for existing MSSQL databases (localhost + Azure SQL)
        const string upgradeSql = """
            IF COL_LENGTH('CoupleRooms', 'Mode') IS NULL
                ALTER TABLE CoupleRooms ADD Mode NVARCHAR(32) NOT NULL DEFAULT 'deck';

            IF COL_LENGTH('CoupleRooms', 'PartnerACardsJson') IS NULL
                ALTER TABLE CoupleRooms ADD PartnerACardsJson NVARCHAR(MAX) NULL;

            IF COL_LENGTH('CoupleRooms', 'PartnerBCardsJson') IS NULL
                ALTER TABLE CoupleRooms ADD PartnerBCardsJson NVARCHAR(MAX) NULL;

            IF OBJECT_ID('DesireProfiles', 'U') IS NULL
            BEGIN
                CREATE TABLE DesireProfiles (
                    ClientId NVARCHAR(64) NOT NULL PRIMARY KEY,
                    DominanceAxis INT NOT NULL DEFAULT 50,
                    TabooAxis INT NOT NULL DEFAULT 50,
                    MindBodyAxis INT NOT NULL DEFAULT 50,
                    RitualAxis INT NOT NULL DEFAULT 50,
                    IntensityAxis INT NOT NULL DEFAULT 50,
                    OpennessAxis INT NOT NULL DEFAULT 45,
                    CompletedConfessions INT NOT NULL DEFAULT 0,
                    CompletedPenances INT NOT NULL DEFAULT 0,
                    CompletedCoupleNights INT NOT NULL DEFAULT 0,
                    PrimaryArchetype NVARCHAR(128) NOT NULL DEFAULT N'Neznámý poutník',
                    LastPenanceTitle NVARCHAR(200) NULL,
                    LastPenanceFeedback NVARCHAR(64) NULL,
                    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
            END;

            IF OBJECT_ID('DailyQuestions', 'U') IS NULL
            BEGIN
                CREATE TABLE DailyQuestions (
                    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    QuestionKey NVARCHAR(64) NOT NULL UNIQUE,
                    QuestionText NVARCHAR(400) NOT NULL,
                    OptionA NVARCHAR(200) NOT NULL,
                    OptionB NVARCHAR(200) NOT NULL,
                    VotesA INT NOT NULL DEFAULT 0,
                    VotesB INT NOT NULL DEFAULT 0,
                    ConfessorCommentA NVARCHAR(400) NOT NULL,
                    ConfessorCommentB NVARCHAR(400) NOT NULL
                );
            END;
            """;

        await db.Database.ExecuteSqlRawAsync(upgradeSql);

        if (!await db.SinWallEntries.AnyAsync())
        {
            logger.LogInformation("Seeding initial Sin Wall entries into MSSQL ZpovedniceDb...");

            db.SinWallEntries.AddRange(
            [
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
            ]);
            await db.SaveChangesAsync();
        }

        if (!await db.DailyQuestions.AnyAsync())
        {
            logger.LogInformation("Seeding Daily Sin Questions into MSSQL...");
            db.DailyQuestions.AddRange(
            [
                new()
                {
                    QuestionKey = "spark_trigger",
                    QuestionText = "Co v tobě zažehne jiskru rychleji: nečekaná pikantní zpráva ve dvě odpoledne, nebo naprostá tma a zakryté oči?",
                    OptionA = "Pikantní zpráva uprostřed dne",
                    OptionB = "Tma, ticho a zakryté oči",
                    VotesA = 134,
                    VotesB = 98,
                    ConfessorCommentA = "Tvoje touha začíná v hlavě. Stačí jediná dobře mířená věta v 14:15 a večer už nemusí nikdo nic vysvětlovat.",
                    ConfessorCommentB = "Když zmizí zrak, každý dotek pálí dvojnásob. Hledáš naprosté odevzdání přítomnému okamžiku."
                },
                new()
                {
                    QuestionKey = "control_or_surrender",
                    QuestionText = "Kdybys dnes večer mohl/a na hodinu zahodit veškerý stud: raději bys udával/a každé pravidlo, nebo všechno nechal/a na partnerovi?",
                    OptionA = "Udávat každé pravidlo a tempo",
                    OptionB = "Pustit kontrolu a nechat se vést",
                    VotesA = 88,
                    VotesB = 146,
                    ConfessorCommentA = "Tichý stratég. Vzrušuje tě reakce druhého ve chvíli, kdy přesně víš, jaký krok přijde dál.",
                    ConfessorCommentB = "Přes den toho řídíš až moc. Tvé tělo touží po vzácném luxusu — chvíli o ničem nerozhodovat."
                },
                new()
                {
                    QuestionKey = "stranger_or_deep",
                    QuestionText = "Co tě láká víc na dnešní noc: zahrát si na cizince v hotelovém baru, nebo si pošeptat jednu věc, kterou jste si ještě nikdy neřekli?",
                    OptionA = "Hra na cizince a špetka tajemství",
                    OptionB = "Odvážná upřímnost bez masek",
                    VotesA = 112,
                    VotesB = 129,
                    ConfessorCommentA = "Novost je nejsilnější koření. Jakmile shodíš všední jméno, probudí se verze tebe, která se nebojí.",
                    ConfessorCommentB = "Nejsilnější afrodiziakum není převlek, ale pohled do očí ve chvíli, kdy padne poslední tabu."
                }
            ]);
            await db.SaveChangesAsync();
        }
    }
}
