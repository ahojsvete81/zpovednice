import type {
  CoupleModeType,
  CoupleRoomStatus,
  DesireCard,
  DesireProfile,
  GenderOption,
  GroupPoolState,
  HealthStatus,
  IntensityLevel,
  MaskStyle,
  Persona,
  PoolHeatMode,
  PoolPresets,
  SeekingOption,
  SinWallEntry,
} from '../types/confession';

const CLIENT_STORAGE_KEY = 'odpustek_client_id';

export function getOrCreateClientId(): string {
  let id = localStorage.getItem(CLIENT_STORAGE_KEY);
  if (!id) {
    id = `sin_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    localStorage.setItem(CLIENT_STORAGE_KEY, id);
  }
  return id;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    let errMsg = `Chyba serveru (${res.status})`;
    let code: string | undefined;
    try {
      const data = await res.json();
      if (data?.error) errMsg = data.error;
      if (data?.code) code = data.code;
    } catch {
      // ignore
    }
    throw new ApiError(errMsg, res.status, code);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<HealthStatus>('/api/health'),
  getPersonas: () => request<Persona[]>('/api/personas'),
  getCoupleCards: () => request<DesireCard[]>('/api/couple/cards'),
  getProfile: (clientId: string) =>
    request<DesireProfile>(`/api/profile/${encodeURIComponent(clientId)}`),

  // ─── TAJNÝ KRUH (GROUP POOL) ───────────────────────────────────────────────
  getPoolPresets: () => request<PoolPresets>('/api/pool/presets'),

  createPool: (payload: {
    clientId: string;
    title: string;
    heatMode: PoolHeatMode;
    gender: GenderOption;
    seeking: SeekingOption;
    clue1: string;
    maskName?: string;
    maskSymbol?: string;
    maskStyle?: MaskStyle;
  }) =>
    request<GroupPoolState>('/api/pool', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  joinPool: (
    poolCode: string,
    payload: {
      clientId: string;
      gender: GenderOption;
      seeking: SeekingOption;
      clue1: string;
      maskName?: string;
      maskSymbol?: string;
      maskStyle?: MaskStyle;
    }
  ) =>
    request<GroupPoolState>(`/api/pool/${encodeURIComponent(poolCode)}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMask: (
    poolCode: string,
    payload: {
      clientId: string;
      maskName: string;
      maskSymbol: string;
      maskStyle: MaskStyle;
    }
  ) =>
    request<GroupPoolState>(`/api/pool/${encodeURIComponent(poolCode)}/mask`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getPoolState: (poolCode: string, clientId: string) =>
    request<GroupPoolState>(
      `/api/pool/${encodeURIComponent(poolCode)}/state?clientId=${encodeURIComponent(clientId)}`
    ),

  dropPoolSpark: (
    poolCode: string,
    payload: { clientId: string; text: string; intentLevel: string }
  ) =>
    request<GroupPoolState>(`/api/pool/${encodeURIComponent(poolCode)}/sparks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  dropSystemSpark: (poolCode: string, clientId: string) =>
    request<GroupPoolState>(
      `/api/pool/${encodeURIComponent(poolCode)}/sparks/system?clientId=${encodeURIComponent(clientId)}`,
      { method: 'POST' }
    ),

  catchPoolSpark: (
    poolCode: string,
    sparkId: string,
    payload: { clientId: string; pitchText: string }
  ) =>
    request<GroupPoolState>(
      `/api/pool/${encodeURIComponent(poolCode)}/sparks/${sparkId}/catch`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  selectPoolCatch: (poolCode: string, sparkId: string, catchId: string, clientId: string) =>
    request<GroupPoolState>(
      `/api/pool/${encodeURIComponent(poolCode)}/sparks/${sparkId}/select/${catchId}?clientId=${encodeURIComponent(clientId)}`,
      { method: 'POST' }
    ),

  reportPoolSpark: (poolCode: string, sparkId: string) =>
    request<{ reported: boolean; burned: boolean }>(
      `/api/pool/${encodeURIComponent(poolCode)}/sparks/${sparkId}/report`,
      { method: 'POST' }
    ),

  submitChamberChemistry: (
    chamberId: string,
    payload: { clientId: string; farLimit: string; dynamicStyle: string; whisperLine: string }
  ) =>
    request<GroupPoolState>(`/api/pool/chambers/${chamberId}/chemistry`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  advanceChamber: (
    chamberId: string,
    payload: {
      clientId: string;
      action:
        | 'consent_stage1'
        | 'signal_a_sent'
        | 'signal_a_spotted'
        | 'signal_b_sent'
        | 'signal_b_spotted'
        | 'set_spot';
      meetingSpot?: string;
    }
  ) =>
    request<GroupPoolState>(`/api/pool/chambers/${chamberId}/advance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  burnChamber: (chamberId: string, clientId: string) =>
    request<GroupPoolState>(
      `/api/pool/chambers/${chamberId}/burn?clientId=${encodeURIComponent(clientId)}`,
      { method: 'DELETE' }
    ),

  spawnPoolDemoBot: (poolCode: string, clientId: string) =>
    request<GroupPoolState>(
      `/api/pool/${encodeURIComponent(poolCode)}/demo-bot?clientId=${encodeURIComponent(clientId)}`,
      { method: 'POST' }
    ),

  // ─── COUPLE MODE 2.0 ───────────────────────────────────────────────────────
  createCoupleRoom: (
    clientId: string,
    personaId: string,
    intensity: IntensityLevel,
    mode: CoupleModeType
  ) =>
    request<CoupleRoomStatus>('/api/couple/rooms', {
      method: 'POST',
      body: JSON.stringify({ clientId, personaId, intensity, mode }),
    }),

  getCoupleRoom: (roomCode: string) =>
    request<CoupleRoomStatus>(`/api/couple/rooms/${encodeURIComponent(roomCode)}`),

  submitCoupleConfession: (
    roomCode: string,
    payload: {
      clientId: string;
      partnerRole: 'A' | 'B';
      confessionText?: string;
      boundaries?: string[];
      cardVotes?: Record<string, string>;
    }
  ) =>
    request<CoupleRoomStatus>(`/api/couple/rooms/${encodeURIComponent(roomCode)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  burnCoupleRoom: (roomCode: string) =>
    request<{ burned: boolean; message: string }>(
      `/api/couple/rooms/${encodeURIComponent(roomCode)}/burn`,
      { method: 'DELETE' }
    ),

  // ─── SIN WALL ──────────────────────────────────────────────────────────────
  getSinWall: () => request<SinWallEntry[]>('/api/wall'),

  voteSinWall: (id: string, vote: 'forgive' | 'hell') =>
    request<SinWallEntry>(`/api/wall/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote }),
    }),

  publishToWall: (payload: {
    confessionText: string;
    category: string;
    personaName: string;
    sinIndex: number;
    archetype: string;
  }) =>
    request<SinWallEntry>('/api/wall', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
