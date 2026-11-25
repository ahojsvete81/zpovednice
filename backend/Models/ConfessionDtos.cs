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

// ─── COUPLE MODE 2.0 ──────────────────────────────────────────────────────────
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
    string Kind,
    string MatchStrength,
    string Description
);

public record CreateCoupleRoomRequest(
    string ClientId,
    string PersonaId,
    string Intensity,
    string Mode = "deck"
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
    string PartnerRole,
    string? ConfessionText,
    List<string>? Boundaries,
    Dictionary<string, string>? CardVotes
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

// ─── TAJNÝ KRUH (GROUP POOL FOR 6–30 PEOPLE) ─────────────────────────────────
public record MaskStyleDto(
    string Shape,  // "venetian" | "cat" | "phantom" | "crown" | "butterfly"
    string Color,  // hex base color
    string Accent  // hex trim/glow color
);

public record PoolPresetsDto(
    string[] CluePresets,
    string[] QuickSparks,
    string[] MeetingSpots
);

public record CreatePoolRequest(
    string ClientId,
    string Title,
    string HeatMode, // "flirt" | "night" | "unleashed"
    string Gender,   // "M" | "F" | "X"
    string Seeking,  // "M" | "F" | "Any"
    string Clue1,
    string? MaskName = null,
    string? MaskSymbol = null,
    MaskStyleDto? MaskStyle = null
);

public record JoinPoolRequest(
    string ClientId,
    string Gender,
    string Seeking,
    string Clue1,
    string? MaskName = null,
    string? MaskSymbol = null,
    MaskStyleDto? MaskStyle = null
);

public record UpdateMaskRequest(
    string ClientId,
    string MaskName,
    string MaskSymbol,
    MaskStyleDto MaskStyle
);

public record CreateSparkRequest(
    string ClientId,
    string Text,
    string IntentLevel
);

public record CatchSparkRequest(
    string ClientId,
    string PitchText
);

public record PoolCatchDto(
    Guid CatchId,
    string CatcherMaskName,
    string CatcherMaskSymbol,
    MaskStyleDto? CatcherMaskStyle,
    string PitchText,
    string Status
);

public record PoolSparkDto(
    Guid Id,
    string AuthorMaskName,
    string AuthorMaskSymbol,
    MaskStyleDto? AuthorMaskStyle,
    string Text,
    string IntentLevel,
    bool IsSystemSpark,
    bool IsMine,
    bool AlreadyCaughtByMe,
    int CatchCount,
    List<PoolCatchDto> IncomingCatches, // Visible ONLY to spark author!
    DateTime CreatedAt
);

public record ChemistryAnswersDto(
    string FarLimit,
    string DynamicStyle,
    string WhisperLine
);

public record SubmitChemistryRequest(
    string ClientId,
    string FarLimit,
    string DynamicStyle,
    string WhisperLine
);

public record AdvanceChamberRequest(
    string ClientId,
    string Action, // "consent_stage1" | "signal_a_sent" | "signal_a_spotted" | "signal_b_sent" | "signal_b_spotted" | "set_spot"
    string? MeetingSpot = null
);

public record MaskChamberDto(
    Guid Id,
    int Stage, // 1=Chemistry, 2=SignalA, 3=SignalB, 4=Rendezvous
    string MyRole, // "A" (Proposer) or "B" (Catcher)
    string MyMaskName,
    string MyMaskSymbol,
    MaskStyleDto? MyMaskStyle,
    string OtherMaskName,
    string OtherMaskSymbol,
    MaskStyleDto? OtherMaskStyle,
    string? OtherClue1, // Revealed after both complete Stage 1!
    string SparkText,
    bool MyAnswersSubmitted,
    bool OtherAnswersSubmitted,
    ChemistryAnswersDto? MyAnswers,
    ChemistryAnswersDto? OtherAnswers, // Revealed ONLY when both submitted!
    bool MyConsentStage1,
    bool OtherConsentStage1,
    string? MySignalInstruction,
    string? WatchForSignalHint,
    bool SignalASent,
    bool SignalAConfirmedByB,
    bool SignalBSent,
    bool SignalBConfirmedByA,
    string? Passphrase,
    string? MeetingSpot,
    string? Icebreaker,
    string? ConfessorVerdict
);

public record PoolMemberMeDto(
    Guid MemberId,
    string MaskName,
    string MaskSymbol,
    MaskStyleDto? MaskStyle,
    string Gender,
    string Seeking,
    string Clue1,
    int GoldenMatchesLeft
);

public record GroupPoolStateResponse(
    string PoolCode,
    string Title,
    string HeatMode,
    DateTime ExpiresAt,
    int MemberCount,
    int OpenSparksCount,
    int TotalSparksCount,
    int ActiveChambersCount,
    int BurnedChambersCount,
    int CompletedRendezvousCount,
    PoolMemberMeDto? Me,
    List<PoolSparkDto> Sparks,
    MaskChamberDto? ActiveChamber,
    bool LastChamberBurnedNotice
);

// ─── SIN WALL ─────────────────────────────────────────────────────────────────
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
