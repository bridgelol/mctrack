export interface ApiKey {
  id: string;
  networkId: string;
  gamemodeId: string | null;
  keyHash: string;
  name: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface ApiKeyWithPrefix {
  id: string;
  networkId: string;
  gamemodeId: string | null;
  name: string;
  prefix: string; // First 8 chars for identification
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string; // Full key, only shown once
  name: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Ingestion API types
export interface SessionStartRequest {
  playerUuid: string;
  playerName: string;
  domain: string;
  ipAddress: string;
  platform: 'java' | 'bedrock';
  bedrockDevice?: string;
}

export interface SessionStartResponse {
  sessionUuid: string;
}

export interface SessionEndRequest {
  sessionUuid: string;
}

export interface GameModeSessionRequest {
  sessionUuid: string;
  gamemodeId: string;
  serverName?: string;
}

export interface BatchEventRequest {
  events: Array<
    | { type: 'session_start'; data: SessionStartRequest }
    | { type: 'session_end'; data: SessionEndRequest }
    | { type: 'gamemode_session'; data: GameModeSessionRequest }
  >;
}
