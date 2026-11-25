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

public record DesireProfileDto(
    string ClientId,
    int DominanceAxis,
    int TabooAxis,
    int MindBodyAxis,
    int RitualAxis,
    int IntensityAxis,
    int OpennessAxis,
    int CompletedConfessions,
    int CompletedPenances,
    int CompletedCoupleNights,
    int InitiationLevel,
    int RevealPercent,
    string PrimaryArchetype,
    string PortraitSummary,
    string BlindSpotInsight,
    string? LastPenanceTitle
);

public record CompletePenanceRequest(
    string ClientId,
    string PenanceTitle,
    string Feedback // "bolder" | "perfect" | "gentler"
);

public record DailyQuestionDto(
    int Id,
    string QuestionKey,
    string QuestionText,
    string OptionA,
    string OptionB,
    int VotesA,
    int VotesB,
    string ConfessorCommentA,
    string ConfessorCommentB
);

public record VoteDailyQuestionRequest(string Choice); // "A" or "B"

// 3-Layer Solo Confession Probe (Layer 2)
public record SoloProbeRequest(
    string ClientId,
    string PersonaId,
    string ConfessionText,
    string Intensity
);

public record SoloProbeResponse(
    string PersonaId,
    string PersonaName,
    string MirrorReaction,
    string ProbingQuestion,
    List<string> QuickChoices,
    bool UsedLiveAi,
    bool IsSafetyIntervention,
    CrisisHelpDto? CrisisHelp
);

public record SoloConfessionRequest(
    string ClientId,
    string PersonaId,
    string ConfessionText,
    string Intensity,
    bool PublishToWall = false,
    string? ProbeQuestion = null,
    string? DeepAnswer = null,
    string ContextMode = "solo" // "solo" | "partner"
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
    WalletDto Wallet,
    DesireProfileDto Profile
);

// Couple Mode 2.0
public record DesireCardDto(
    string Id,
    string Category,
    string Title,
    string Prompt,
    int SpiceLevel,
    string? ComplementaryCardId,
    string? PolarityLabel
);

public record MatchedDesireDto(
    string Title,
    string Kind, // "exact" | "polarity"
    string MatchStrength, // "Hořící shoda" | "Magnetická polarita" | "Jemná jiskra"
    string Description
);

public record CreateCoupleRoomRequest(
    string ClientId,
    string PersonaId,
    string Intensity,
    string Mode = "deck" // "deck" | "confession" | "honesty"
);

public record CoupleRoomStatusResponse(
    string RoomCode,
    string PersonaId,
    string Intensity,
    string Mode,
    bool PartnerASubmitted,
    bool PartnerBSubmitted,
    bool IsReady,
    CoupleScenarioDto? Scenario,
    DateTime ExpiresAt
);

public record SubmitCoupleConfessionRequest(
    string ClientId,
    string PartnerRole, // "A" or "B"
    string? ConfessionText,
    List<string>? Boundaries,
    Dictionary<string, string>? CardVotes // cardId -> "yes" | "maybe" | "no"
);

public record CoupleStepDto(
    int StepNumber,
    string Phase,
    string Title,
    string Instruction,
    string GentleVariation,
    string BoldVariation,
    string Duration,
    int DurationMinutes
);

public record CoupleScenarioDto(
    string Title,
    string Mode,
    string SharedSparkSummary,
    int ChemistryScore,
    string ArchetypePair,
    string ConfessorIntro,
    string DaytimeSparkMessage,
    List<MatchedDesireDto> MatchedDesires,
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

public record VoteSinWallRequest(string Vote);

public record PublishSinWallRequest(
    string ConfessionText,
    string Category,
    string PersonaName,
    int SinIndex,
    string Archetype
);

public record PurchasePackageRequest(
    string ClientId,
    string PackageCode
);

public record PurchaseResponse(
    bool Success,
    string Message,
    WalletDto Wallet
);
