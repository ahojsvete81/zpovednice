using Microsoft.EntityFrameworkCore;

namespace Zpovednice.Api.Data;

public class ZpovedniceDbContext(DbContextOptions<ZpovedniceDbContext> options) : DbContext(options)
{
    public DbSet<WalletEntity> Wallets => Set<WalletEntity>();
    public DbSet<CoupleRoomEntity> CoupleRooms => Set<CoupleRoomEntity>();
    public DbSet<SinWallEntryEntity> SinWallEntries => Set<SinWallEntryEntity>();
    public DbSet<CreditTransactionEntity> CreditTransactions => Set<CreditTransactionEntity>();
    public DbSet<DesireProfileEntity> DesireProfiles => Set<DesireProfileEntity>();

    // Tajný Kruh (Group Pool for 6–30 people)
    public DbSet<GroupPoolEntity> GroupPools => Set<GroupPoolEntity>();
    public DbSet<PoolMemberEntity> PoolMembers => Set<PoolMemberEntity>();
    public DbSet<PoolSparkEntity> PoolSparks => Set<PoolSparkEntity>();
    public DbSet<PoolSparkCatchEntity> PoolSparkCatches => Set<PoolSparkCatchEntity>();
    public DbSet<MaskChamberEntity> MaskChambers => Set<MaskChamberEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WalletEntity>(e =>
        {
            e.HasKey(x => x.ClientId);
            e.Property(x => x.ClientId).HasMaxLength(64);
        });

        modelBuilder.Entity<CoupleRoomEntity>(e =>
        {
            e.HasKey(x => x.RoomCode);
            e.Property(x => x.RoomCode).HasMaxLength(16);
            e.Property(x => x.PersonaId).HasMaxLength(32);
            e.Property(x => x.Intensity).HasMaxLength(32);
            e.Property(x => x.Mode).HasMaxLength(32);
        });

        modelBuilder.Entity<SinWallEntryEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.PersonaName).HasMaxLength(64);
            e.Property(x => x.Archetype).HasMaxLength(128);
            e.Property(x => x.Category).HasMaxLength(64);
            e.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<CreditTransactionEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ClientId).HasMaxLength(64);
            e.Property(x => x.PackageCode).HasMaxLength(64);
            e.Property(x => x.Description).HasMaxLength(256);
            e.HasIndex(x => x.ClientId);
        });

        modelBuilder.Entity<DesireProfileEntity>(e =>
        {
            e.HasKey(x => x.ClientId);
            e.Property(x => x.ClientId).HasMaxLength(64);
            e.Property(x => x.PrimaryArchetype).HasMaxLength(128);
            e.Property(x => x.LastPenanceTitle).HasMaxLength(200);
            e.Property(x => x.LastPenanceFeedback).HasMaxLength(64);
        });

        modelBuilder.Entity<GroupPoolEntity>(e =>
        {
            e.HasKey(x => x.PoolCode);
            e.Property(x => x.PoolCode).HasMaxLength(16);
            e.Property(x => x.Title).HasMaxLength(120);
            e.Property(x => x.HeatMode).HasMaxLength(32);
        });

        modelBuilder.Entity<PoolMemberEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.PoolCode).HasMaxLength(16);
            e.Property(x => x.ClientId).HasMaxLength(64);
            e.Property(x => x.MaskName).HasMaxLength(64);
            e.Property(x => x.MaskSymbol).HasMaxLength(16);
            e.Property(x => x.Gender).HasMaxLength(8);
            e.Property(x => x.Seeking).HasMaxLength(8);
            e.Property(x => x.Clue1).HasMaxLength(180);
            e.HasIndex(x => new { x.PoolCode, x.ClientId }).IsUnique();
        });

        modelBuilder.Entity<PoolSparkEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.PoolCode).HasMaxLength(16);
            e.Property(x => x.Text).HasMaxLength(400);
            e.Property(x => x.IntentLevel).HasMaxLength(32);
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.PoolCode);
        });

        modelBuilder.Entity<PoolSparkCatchEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.PitchText).HasMaxLength(260);
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.SparkId);
        });

        modelBuilder.Entity<MaskChamberEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.PoolCode).HasMaxLength(16);
            e.Property(x => x.SignalAText).HasMaxLength(300);
            e.Property(x => x.SignalBText).HasMaxLength(300);
            e.Property(x => x.Passphrase).HasMaxLength(160);
            e.Property(x => x.MeetingSpot).HasMaxLength(120);
            e.Property(x => x.Icebreaker).HasMaxLength(300);
            e.HasIndex(x => x.PoolCode);
        });
    }
}

public class WalletEntity
{
    public string ClientId { get; set; } = string.Empty;
    public int OdpustkyBalance { get; set; } = 3;
    public bool IsVip { get; set; }
    public int TotalConfessions { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CoupleRoomEntity
{
    public string RoomCode { get; set; } = string.Empty;
    public string PersonaId { get; set; } = "dominik";
    public string Intensity { get; set; } = "spicy";
    public string Mode { get; set; } = "deck";
    public string? PartnerAConfession { get; set; }
    public string? PartnerABoundaries { get; set; }
    public string? PartnerACardsJson { get; set; }
    public bool PartnerASubmitted { get; set; }
    public string? PartnerBConfession { get; set; }
    public string? PartnerBBoundaries { get; set; }
    public string? PartnerBCardsJson { get; set; }
    public bool PartnerBSubmitted { get; set; }
    public string? ScenarioJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(12);
}

public class SinWallEntryEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ConfessionText { get; set; } = string.Empty;
    public string PersonaName { get; set; } = string.Empty;
    public int SinIndex { get; set; }
    public string Archetype { get; set; } = string.Empty;
    public string Category { get; set; } = "Fantazie";
    public int ForgivenCount { get; set; }
    public int HellCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CreditTransactionEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ClientId { get; set; } = string.Empty;
    public string PackageCode { get; set; } = string.Empty;
    public int OdpustkyDelta { get; set; }
    public int AmountCzk { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class DesireProfileEntity
{
    public string ClientId { get; set; } = string.Empty;
    public int DominanceAxis { get; set; } = 50;
    public int TabooAxis { get; set; } = 50;
    public int MindBodyAxis { get; set; } = 50;
    public int RitualAxis { get; set; } = 50;
    public int IntensityAxis { get; set; } = 50;
    public int OpennessAxis { get; set; } = 45;
    public int CompletedConfessions { get; set; }
    public int CompletedPenances { get; set; }
    public int CompletedCoupleNights { get; set; }
    public string PrimaryArchetype { get; set; } = "Neznámý poutník";
    public string? LastPenanceTitle { get; set; }
    public string? LastPenanceFeedback { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class GroupPoolEntity
{
    public string PoolCode { get; set; } = string.Empty;
    public string Title { get; set; } = "Noční Klášter";
    public string HeatMode { get; set; } = "night"; // "flirt" | "night" | "unleashed"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(12);
}

public class PoolMemberEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PoolCode { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string MaskName { get; set; } = string.Empty;
    public string MaskSymbol { get; set; } = "🎭";
    public string Gender { get; set; } = "X";   // "M" | "F" | "X"
    public string Seeking { get; set; } = "Any"; // "M" | "F" | "Any"
    public string Clue1 { get; set; } = string.Empty;
    public int GoldenMatchesLeft { get; set; } = 3;
    public bool IsDemoBot { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public class PoolSparkEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PoolCode { get; set; } = string.Empty;
    public Guid AuthorMemberId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string IntentLevel { get; set; } = "night";
    public bool IsSystemSpark { get; set; }
    public string Status { get; set; } = "Open"; // "Open" | "Matched" | "Burned"
    public int ReportCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PoolSparkCatchEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SparkId { get; set; }
    public Guid CatcherMemberId { get; set; }
    public string PitchText { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // "Pending" | "Selected" | "Refunded"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MaskChamberEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PoolCode { get; set; } = string.Empty;
    public Guid SparkId { get; set; }
    public Guid MemberAId { get; set; }
    public Guid MemberBId { get; set; }
    public int Stage { get; set; } = 1; // 1=Chemistry, 2=SignalA, 3=SignalB, 4=Rendezvous, 9=Burned
    public string? AnswersAJson { get; set; }
    public string? AnswersBJson { get; set; }
    public bool ConsentStage1A { get; set; }
    public bool ConsentStage1B { get; set; }
    public string SignalAText { get; set; } = string.Empty;
    public bool SignalASent { get; set; }
    public bool SignalAConfirmedByB { get; set; }
    public string SignalBText { get; set; } = string.Empty;
    public bool SignalBSent { get; set; }
    public bool SignalBConfirmedByA { get; set; }
    public string Passphrase { get; set; } = string.Empty;
    public string MeetingSpot { get; set; } = "Za 5 minut na terase";
    public string Icebreaker { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
