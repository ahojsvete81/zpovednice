using Microsoft.EntityFrameworkCore;

namespace Zpovednice.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(ZpovedniceDbContext db, ILogger logger)
    {
        await db.Database.EnsureCreatedAsync();

        // Idempotent MSSQL schema upgrade (works seamlessly on existing localhost & Azure SQL DBs)
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

            IF OBJECT_ID('GroupPools', 'U') IS NULL
            BEGIN
                CREATE TABLE GroupPools (
                    PoolCode NVARCHAR(16) NOT NULL PRIMARY KEY,
                    Title NVARCHAR(120) NOT NULL,
                    HeatMode NVARCHAR(32) NOT NULL DEFAULT 'night',
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    ExpiresAt DATETIME2 NOT NULL
                );
            END;

            IF OBJECT_ID('PoolMembers', 'U') IS NULL
            BEGIN
                CREATE TABLE PoolMembers (
                    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    PoolCode NVARCHAR(16) NOT NULL,
                    ClientId NVARCHAR(64) NOT NULL,
                    MaskName NVARCHAR(64) NOT NULL,
                    MaskSymbol NVARCHAR(16) NOT NULL,
                    Gender NVARCHAR(8) NOT NULL,
                    Seeking NVARCHAR(8) NOT NULL,
                    Clue1 NVARCHAR(180) NOT NULL,
                    GoldenMatchesLeft INT NOT NULL DEFAULT 3,
                    IsDemoBot BIT NOT NULL DEFAULT 0,
                    JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
                CREATE UNIQUE INDEX IX_PoolMembers_Pool_Client ON PoolMembers (PoolCode, ClientId);
            END;

            IF OBJECT_ID('PoolSparks', 'U') IS NULL
            BEGIN
                CREATE TABLE PoolSparks (
                    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    PoolCode NVARCHAR(16) NOT NULL,
                    AuthorMemberId UNIQUEIDENTIFIER NOT NULL,
                    Text NVARCHAR(400) NOT NULL,
                    IntentLevel NVARCHAR(32) NOT NULL,
                    IsSystemSpark BIT NOT NULL DEFAULT 0,
                    Status NVARCHAR(24) NOT NULL DEFAULT 'Open',
                    ReportCount INT NOT NULL DEFAULT 0,
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
                CREATE INDEX IX_PoolSparks_PoolCode ON PoolSparks (PoolCode);
            END;

            IF OBJECT_ID('PoolSparkCatches', 'U') IS NULL
            BEGIN
                CREATE TABLE PoolSparkCatches (
                    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    SparkId UNIQUEIDENTIFIER NOT NULL,
                    CatcherMemberId UNIQUEIDENTIFIER NOT NULL,
                    PitchText NVARCHAR(260) NOT NULL,
                    Status NVARCHAR(24) NOT NULL DEFAULT 'Pending',
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
                CREATE INDEX IX_PoolSparkCatches_SparkId ON PoolSparkCatches (SparkId);
            END;

            IF OBJECT_ID('MaskChambers', 'U') IS NULL
            BEGIN
                CREATE TABLE MaskChambers (
                    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    PoolCode NVARCHAR(16) NOT NULL,
                    SparkId UNIQUEIDENTIFIER NOT NULL,
                    MemberAId UNIQUEIDENTIFIER NOT NULL,
                    MemberBId UNIQUEIDENTIFIER NOT NULL,
                    Stage INT NOT NULL DEFAULT 1,
                    AnswersAJson NVARCHAR(MAX) NULL,
                    AnswersBJson NVARCHAR(MAX) NULL,
                    ConsentStage1A BIT NOT NULL DEFAULT 0,
                    ConsentStage1B BIT NOT NULL DEFAULT 0,
                    SignalAText NVARCHAR(300) NOT NULL,
                    SignalASent BIT NOT NULL DEFAULT 0,
                    SignalAConfirmedByB BIT NOT NULL DEFAULT 0,
                    SignalBText NVARCHAR(300) NOT NULL,
                    SignalBSent BIT NOT NULL DEFAULT 0,
                    SignalBConfirmedByA BIT NOT NULL DEFAULT 0,
                    Passphrase NVARCHAR(160) NOT NULL,
                    MeetingSpot NVARCHAR(120) NOT NULL,
                    Icebreaker NVARCHAR(300) NOT NULL,
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
                CREATE INDEX IX_MaskChambers_PoolCode ON MaskChambers (PoolCode);
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
                    ConfessionText = "Na poslední chatě s partou jsem celou noc nemohl spustit oči z jedné holky od vedlejšího stolu, ale nikdo z nás nenašel odvahu udělat první krok.",
                    PersonaName = "Mefisto",
                    SinIndex = 84,
                    Archetype = "Lovec tajných pohledů",
                    Category = "Tajný Kruh",
                    ForgivenCount = 196,
                    HellCount = 14,
                    CreatedAt = DateTime.UtcNow.AddHours(-16)
                },
                new()
                {
                    ConfessionText = "Ve dne vedu tým dvaceti lidí a řeším milionové rozpočty. V noci ale sním jen o tom, aby mi partner zabavil telefon, vzal si šátek a na hodinu mi řekl přesně, co mám dělat.",
                    PersonaName = "Matka představená",
                    SinIndex = 86,
                    Archetype = "Krotitel skryté poslušnosti",
                    Category = "Dominance",
                    ForgivenCount = 142,
                    HellCount = 19,
                    CreatedAt = DateTime.UtcNow.AddHours(-12)
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
                    CreatedAt = DateTime.UtcNow.AddHours(-8)
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
                    CreatedAt = DateTime.UtcNow.AddHours(-2)
                }
            ]);
            await db.SaveChangesAsync();
        }
    }
}
