export interface Persona {
  id: string;
  name: string;
  title: string;
  tagline: string;
  style: string;
  odpustkyCost: number;
  isPremium: boolean;
  accentColor: string;
  avatarSymbol: string;
  voicePitch: number;
  voiceRate: number;
}

export interface DesireProfile {
  clientId: string;
  dominanceAxis: number;
  tabooAxis: number;
  mindBodyAxis: number;
  ritualAxis: number;
  intensityAxis: number;
  opennessAxis: number;
  completedConfessions: number;
  completedPenances: number;
  completedCoupleNights: number;
  initiationLevel: number;
  revealPercent: number;
  primaryArchetype: string;
  portraitSummary: string;
  blindSpotInsight: string;
  lastPenanceTitle?: string | null;
}

export interface MatchedDesire {
  title: string;
  kind: 'exact' | 'polarity';
  matchStrength: string;
  description: string;
}

export interface CoupleStep {
  stepNumber: number;
  phase: string;
  title: string;
  instruction: string;
  gentleVariation: string;
  boldVariation: string;
  duration: string;
  durationMinutes: number;
}

export interface CoupleScenario {
  title: string;
  mode: CoupleModeType;
  sharedSparkSummary: string;
  chemistryScore: number;
  archetypePair: string;
  confessorIntro: string;
  daytimeSparkMessage: string;
  matchedDesires: MatchedDesire[];
  steps: CoupleStep[];
  closingAbsolution: string;
  usedLiveAi: boolean;
}

export type CoupleModeType = 'confession' | 'honesty';

export interface CoupleRoomStatus {
  roomCode: string;
  personaId: string;
  intensity: string;
  mode: CoupleModeType;
  partnerASubmitted: boolean;
  partnerBSubmitted: boolean;
  isReady: boolean;
  scenario?: CoupleScenario | null;
  expiresAt: string;
}

// ─── TAJNÝ KRUH (GROUP POOL) ─────────────────────────────────────────────────
export type PoolHeatMode = 'flirt' | 'night' | 'unleashed';
export type GenderOption = 'M' | 'F' | 'X';
export type SeekingOption = 'M' | 'F' | 'Any';
export type MaskShape = 'venetian' | 'cat' | 'phantom' | 'crown' | 'butterfly';

export interface MaskStyle {
  shape: MaskShape;
  color: string;
  accent: string;
}

export interface PoolPresets {
  cluePresets: string[];
  quickSparks: string[];
  meetingSpots: string[];
}

export interface PoolMemberMe {
  memberId: string;
  maskName: string;
  maskSymbol: string;
  maskStyle?: MaskStyle | null;
  gender: GenderOption;
  seeking: SeekingOption;
  clue1: string;
  goldenMatchesLeft: number;
}

export interface PoolCatch {
  catchId: string;
  catcherMaskName: string;
  catcherMaskSymbol: string;
  catcherMaskStyle?: MaskStyle | null;
  pitchText: string;
  status: string;
}

export interface PoolSpark {
  id: string;
  authorMaskName: string;
  authorMaskSymbol: string;
  authorMaskStyle?: MaskStyle | null;
  text: string;
  intentLevel: string;
  isSystemSpark: boolean;
  isMine: boolean;
  alreadyCaughtByMe: boolean;
  catchCount: number;
  incomingCatches: PoolCatch[];
  createdAt: string;
}

export interface ChemistryAnswers {
  farLimit: string;
  dynamicStyle: string;
  whisperLine: string;
}

export interface MaskChamber {
  id: string;
  stage: number; // 1=Chemistry, 2=SignalA, 3=SignalB, 4=Rendezvous
  myRole: 'A' | 'B';
  myMaskName: string;
  myMaskSymbol: string;
  myMaskStyle?: MaskStyle | null;
  otherMaskName: string;
  otherMaskSymbol: string;
  otherMaskStyle?: MaskStyle | null;
  otherClue1?: string | null;
  sparkText: string;
  myAnswersSubmitted: boolean;
  otherAnswersSubmitted: boolean;
  myAnswers?: ChemistryAnswers | null;
  otherAnswers?: ChemistryAnswers | null;
  myConsentStage1: boolean;
  otherConsentStage1: boolean;
  mySignalInstruction?: string | null;
  watchForSignalHint?: string | null;
  signalASent: boolean;
  signalAConfirmedByB: boolean;
  signalBSent: boolean;
  signalBConfirmedByA: boolean;
  passphrase?: string | null;
  meetingSpot?: string | null;
  icebreaker?: string | null;
  confessorVerdict?: string | null;
}

export interface GroupPoolState {
  poolCode: string;
  title: string;
  heatMode: PoolHeatMode;
  expiresAt: string;
  memberCount: number;
  openSparksCount: number;
  activeChambersCount: number;
  completedRendezvousCount: number;
  me?: PoolMemberMe | null;
  sparks: PoolSpark[];
  activeChamber?: MaskChamber | null;
  lastChamberBurnedNotice: boolean;
}

export interface SinWallEntry {
  id: string;
  confessionText: string;
  personaName: string;
  sinIndex: number;
  archetype: string;
  category: string;
  forgivenCount: number;
  hellCount: number;
  createdAt: string;
}

export interface HealthStatus {
  status: string;
  database: string;
  dbConnected: boolean;
  sinWallCount: number;
  activePools: number;
  billingEnabled: boolean;
  aiMode: string;
  aiModel?: string;
}

export type IntensityLevel = 'gentle' | 'spicy' | 'burning';
