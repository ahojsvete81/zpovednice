import type {
  CoupleRoomStatus,
  HealthStatus,
  IntensityLevel,
  Persona,
  SinWallEntry,
  SoloConfessionResponse,
  Wallet,
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
      // ignore json parse error
    }
    throw new ApiError(errMsg, res.status, code);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<HealthStatus>('/api/health'),
  getPersonas: () => request<Persona[]>('/api/personas'),
  getWallet: (clientId: string) => request<Wallet>(`/api/wallet/${encodeURIComponent(clientId)}`),

  purchasePackage: (clientId: string, packageCode: 'couple_night' | 'pack_10' | 'vip_month') =>
    request<{ success: boolean; message: string; wallet: Wallet }>('/api/wallet/purchase', {
      method: 'POST',
      body: JSON.stringify({ clientId, packageCode }),
    }),

  submitSoloConfession: (payload: {
    clientId: string;
    personaId: string;
    confessionText: string;
    intensity: IntensityLevel;
    publishToWall: boolean;
  }) =>
    request<SoloConfessionResponse>('/api/confessions/solo', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  burnSoloSession: (sessionId: string) =>
    request<{ burned: boolean; message: string }>(`/api/confessions/${sessionId}/burn`, {
      method: 'DELETE',
    }),

  createCoupleRoom: (clientId: string, personaId: string, intensity: IntensityLevel) =>
    request<CoupleRoomStatus>('/api/couple/rooms', {
      method: 'POST',
      body: JSON.stringify({ clientId, personaId, intensity }),
    }),

  getCoupleRoom: (roomCode: string) =>
    request<CoupleRoomStatus>(`/api/couple/rooms/${encodeURIComponent(roomCode)}`),

  submitCoupleConfession: (
    roomCode: string,
    payload: {
      clientId: string;
      partnerRole: 'A' | 'B';
      confessionText: string;
      boundaries: string[];
    }
  ) =>
    request<CoupleRoomStatus>(`/api/couple/rooms/${encodeURIComponent(roomCode)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  burnCoupleRoom: (roomCode: string) =>
    request<{ burned: boolean; message: string }>(`/api/couple/rooms/${encodeURIComponent(roomCode)}/burn`, {
      method: 'DELETE',
    }),

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
