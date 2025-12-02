export const AuditAction = {
  // Team
  MEMBER_INVITED: 'member_invited',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_DELETED: 'role_deleted',

  // API Keys
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REVOKED: 'api_key_revoked',

  // GameModes
  GAMEMODE_CREATED: 'gamemode_created',
  GAMEMODE_UPDATED: 'gamemode_updated',
  GAMEMODE_DELETED: 'gamemode_deleted',

  // Network
  NETWORK_SETTINGS_UPDATED: 'network_settings_updated',
  NETWORK_TRANSFERRED: 'network_transferred',

  // Campaigns
  CAMPAIGN_CREATED: 'campaign_created',
  CAMPAIGN_UPDATED: 'campaign_updated',
  CAMPAIGN_ARCHIVED: 'campaign_archived',
  CAMPAIGN_SPEND_LOGGED: 'campaign_spend_logged',

  // Webhooks
  WEBHOOK_CREATED: 'webhook_created',
  WEBHOOK_UPDATED: 'webhook_updated',
  WEBHOOK_DELETED: 'webhook_deleted',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
