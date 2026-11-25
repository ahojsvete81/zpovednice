namespace Zpovednice.Api.Models;

public record PersonaDto(
    string Id,
    string Name,
    string Title,
    string Tagline,
    string Style,
    int OdpustkyCost,
    bool IsPremium,
    string AccentColor,
    string AvatarSymbol,
    double VoicePitch,
    double VoiceRate
);

public record WalletDto(
    string ClientId,
    int OdpustkyBalance,
    bool IsVip,
    int TotalConfessions
);

public record SoloConfessionRequest(
    string ClientId,
    string PersonaId,
    string ConfessionText,
    string Intensity,
    bool PublishToWall = false
);

public record PenanceDto(
    string Title,
    string Description,
    string Timing,
    string SpiceLabel
);

public record CrisisHelpDto(
    string Message,
    List<HelplineDto> Helplines
);

public record HelplineDto(string Name, string Contact, string Note);

public record SoloConfessionResponse(
    Guid SessionId,
    string PersonaId,
    string PersonaName,
    int SinIndex,
    string Archetype,
    string AbsolutionText,
    PenanceDto Penance,
    string VoiceScript,
    bool UsedLiveAi,
    bool IsSafetyIntervention,
    CrisisHelpDto? CrisisHelp,
    WalletDto Wallet
);

public record CreateCoupleRoomRequest(
    string ClientId,
    string PersonaId,
    string Intensity
);

public record CoupleRoomStatusResponse(
    string RoomCode,
    string PersonaId,
    string Intensity,
    bool PartnerASubmitted,
    bool PartnerBSubmitted,
    bool IsReady,
    CoupleScenarioDto? Scenario,
    DateTime ExpiresAt
);

public record SubmitCoupleConfessionRequest(
    string ClientId,
    string PartnerRole, // "A" or "B"
    string ConfessionText,
    List<string> Boundaries
);

public record CoupleStepDto(
    int StepNumber,
    string Phase,
    string Title,
    string Instruction,
    string Duration
);

public record CoupleScenarioDto(
    string Title,
    string SharedSparkSummary,
    int ChemistryScore,
    string ArchetypePair,
    string ConfessorIntro,
    List<CoupleStepDto> Steps,
    string ClosingAbsolution,
    bool UsedLiveAi
);

public record SinWallEntryDto(
    Guid Id,
    string ConfessionText,
    string PersonaName,
    int SinIndex,
    string Archetype,
    string Category,
    int ForgivenCount,
    int HellCount,
    DateTime CreatedAt
);

public record VoteSinWallRequest(string Vote); // "forgive" or "hell"

public record PublishSinWallRequest(
    string ConfessionText,
    string Category,
    string PersonaName,
    int SinIndex,
    string Archetype
);

public record PurchasePackageRequest(
    string ClientId,
    string PackageCode // "pack_10", "couple_night", "vip_month"
);

public record PurchaseResponse(
    bool Success,
    string Message,
    WalletDto Wallet
);
