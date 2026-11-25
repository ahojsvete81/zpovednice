using Microsoft.EntityFrameworkCore;

namespace Zpovednice.Api.Data;

public class ZpovedniceDbContext(DbContextOptions<ZpovedniceDbContext> options) : DbContext(options)
{
    public DbSet<WalletEntity> Wallets => Set<WalletEntity>();
    public DbSet<ConfessionSessionEntity> ConfessionSessions => Set<ConfessionSessionEntity>();
    public DbSet<CoupleRoomEntity> CoupleRooms => Set<CoupleRoomEntity>();
    public DbSet<SinWallEntryEntity> SinWallEntries => Set<SinWallEntryEntity>();
    public DbSet<CreditTransactionEntity> CreditTransactions => Set<CreditTransactionEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WalletEntity>(e =>
        {
            e.HasKey(x => x.ClientId);
            e.Property(x => x.ClientId).HasMaxLength(64);
        });

        modelBuilder.Entity<ConfessionSessionEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ClientId).HasMaxLength(64);
            e.Property(x => x.PersonaId).HasMaxLength(32);
            e.Property(x => x.Intensity).HasMaxLength(32);
            e.Property(x => x.Archetype).HasMaxLength(128);
            e.Property(x => x.PenanceTitle).HasMaxLength(200);
            e.Property(x => x.PenanceTiming).HasMaxLength(100);
            e.HasIndex(x => x.ClientId);
        });

        modelBuilder.Entity<CoupleRoomEntity>(e =>
        {
            e.HasKey(x => x.RoomCode);
            e.Property(x => x.RoomCode).HasMaxLength(16);
            e.Property(x => x.PersonaId).HasMaxLength(32);
            e.Property(x => x.Intensity).HasMaxLength(32);
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

public class ConfessionSessionEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ClientId { get; set; } = string.Empty;
    public string PersonaId { get; set; } = string.Empty;
    public string Intensity { get; set; } = "spicy";
    public int SinIndex { get; set; }
    public string Archetype { get; set; } = string.Empty;
    public string AbsolutionText { get; set; } = string.Empty;
    public string PenanceTitle { get; set; } = string.Empty;
    public string PenanceDescription { get; set; } = string.Empty;
    public string PenanceTiming { get; set; } = string.Empty;
    public string VoiceScript { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CoupleRoomEntity
{
    public string RoomCode { get; set; } = string.Empty;
    public string PersonaId { get; set; } = "dominik";
    public string Intensity { get; set; } = "spicy";
    public string? PartnerAConfession { get; set; }
    public string? PartnerABoundaries { get; set; }
    public bool PartnerASubmitted { get; set; }
    public string? PartnerBConfession { get; set; }
    public string? PartnerBBoundaries { get; set; }
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
