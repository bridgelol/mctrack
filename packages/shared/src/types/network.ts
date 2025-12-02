import type { Permission } from '../constants/permissions.js';

export interface Network {
  id: string;
  ownerId: string;
  name: string;
  timezone: string;
  creationTime: Date;
  settings: NetworkSettings;
}

export interface NetworkSettings {
  paymentProviders?: {
    tebex?: {
      enabled: boolean;
      secretKey: string;
      lastSync: string | null;
    };
    paynow?: {
      enabled: boolean;
      apiKey: string;
      lastSync: string | null;
    };
  };
  paymentSyncIntervalMinutes?: number;
}

export interface NetworkRole {
  id: string;
  networkId: string;
  name: string;
  color: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: Date;
}

export interface NetworkMember {
  networkId: string;
  userId: string;
  roleId: string;
  invitedBy: string | null;
  joinedAt: Date;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  role?: NetworkRole;
}

export interface NetworkInvitation {
  id: string;
  networkId: string;
  email: string;
  roleId: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
