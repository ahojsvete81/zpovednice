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
}

export interface CoupleStep {
  stepNumber: number;
  phase: string;
  title: string;
  instruction: string;
  duration: string;
}

export interface CoupleScenario {
  title: string;
  sharedSparkSummary: string;
  chemistryScore: number;
  archetypePair: string;
  confessorIntro: string;
  steps: CoupleStep[];
  closingAbsolution: string;
  usedLiveAi: boolean;
}

export interface CoupleRoomStatus {
  roomCode: string;
  personaId: string;
  intensity: string;
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
  aiMode: string;
}

export type IntensityLevel = 'gentle' | 'spicy' | 'burning';
