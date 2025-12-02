import type { Platform, BedrockDevice } from '../constants/platform.js';

export interface Player {
  networkId: string;
  playerUuid: string;
  playerName: string;
  skinTextures: string | null;
  platform: Platform;
  bedrockDevice: BedrockDevice | null;
  country: string;
  firstSeen: Date;
  lastSeen: Date;
  campaignId: string | null;
}

export interface PlayerSession {
  networkId: string;
  sessionUuid: string;
  playerUuid: string;
  proxyId: string | null;
  gamemodeId: string | null;
  domain: string;
  ipAddress: string;
  playerCountry: string;
  platform: Platform;
  bedrockDevice: BedrockDevice | null;
  startTime: Date;
  endTime: Date | null;
}

export interface GameModeSession {
  gamemodeId: string;
  sessionUuid: string;
  playerUuid: string;
  serverName: string | null;
  ipAddress: string;
  playerCountry: string;
  startTime: Date;
  endTime: Date | null;
}

export interface GameMode {
  id: string;
  networkId: string;
  name: string;
  creationTime: Date;
}
