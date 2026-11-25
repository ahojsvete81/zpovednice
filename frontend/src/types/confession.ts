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

export interface Wallet {
  clientId: string;
  odpustkyBalance: number;
  isVip: boolean;
  totalConfessions: number;
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

export interface DailyQuestion {
  id: number;
  questionKey: string;
  questionText: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  confessorCommentA: string;
  confessorCommentB: string;
}

export interface Penance {
  title: string;
  description: string;
  timing: string;
  spiceLabel: string;
}

export interface Helpline {
  name: string;
  contact: string;
  note: string;
}

export interface CrisisHelp {
  message: string;
  helplines: Helpline[];
}

export interface SoloProbeResponse {
  personaId: string;
  personaName: string;
  mirrorReaction: string;
  probingQuestion: string;
  quickChoices: string[];
  usedLiveAi: boolean;
  isSafetyIntervention: boolean;
  crisisHelp?: CrisisHelp | null;
}

export interface SoloConfessionResponse {
  sessionId: string;
  personaId: string;
  personaName: string;
  sinIndex: number;
  archetype: string;
  absolutionText: string;
  penance: Penance;
  voiceScript: string;
  usedLiveAi: boolean;
  isSafetyIntervention: boolean;
  crisisHelp?: CrisisHelp | null;
  wallet: Wallet;
  profile: DesireProfile;
}

export interface DesireCard {
  id: string;
  category: string;
  title: string;
  prompt: string;
  spiceLevel: number;
  complementaryCardId?: string | null;
  polarityLabel?: string | null;
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

export type CoupleModeType = 'deck' | 'confession' | 'honesty';

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
  billingEnabled: boolean;
  aiMode: string;
}

export type IntensityLevel = 'gentle' | 'spicy' | 'burning';
