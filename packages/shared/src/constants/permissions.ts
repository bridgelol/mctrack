export const Permission = {
  // Dashboard & Analytics
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ADVANCED_ANALYTICS: 'view_advanced_analytics',
  EXPORT_DATA: 'export_data',

  // Players
  VIEW_PLAYERS: 'view_players',
  VIEW_PLAYER_DETAILS: 'view_player_details',

  // Revenue
  VIEW_PAYMENTS: 'view_payments',

  // Campaigns
  VIEW_CAMPAIGNS: 'view_campaigns',
  MANAGE_CAMPAIGNS: 'manage_campaigns',

  // Configuration
  MANAGE_GAMEMODES: 'manage_gamemodes',
  MANAGE_API_KEYS: 'manage_api_keys',
  MANAGE_WEBHOOKS: 'manage_webhooks',
  MANAGE_ALERTS: 'manage_alerts',

  // Team
  VIEW_TEAM: 'view_team',
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  MANAGE_ROLES: 'manage_roles',

  // Danger Zone
  MANAGE_NETWORK_SETTINGS: 'manage_network_settings',
  DELETE_NETWORK: 'delete_network',
  TRANSFER_OWNERSHIP: 'transfer_ownership',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS = Object.values(Permission);

// Permission groups for common role templates
export const PermissionGroups = {
  VIEWER: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PLAYERS,
    Permission.VIEW_CAMPAIGNS,
    Permission.VIEW_TEAM,
  ],
  MODERATOR: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PLAYERS,
    Permission.VIEW_PLAYER_DETAILS,
    Permission.VIEW_CAMPAIGNS,
    Permission.VIEW_TEAM,
    Permission.VIEW_PAYMENTS,
  ],
  ADMIN: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.EXPORT_DATA,
    Permission.VIEW_PLAYERS,
    Permission.VIEW_PLAYER_DETAILS,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_CAMPAIGNS,
    Permission.MANAGE_CAMPAIGNS,
    Permission.MANAGE_GAMEMODES,
    Permission.MANAGE_API_KEYS,
    Permission.MANAGE_WEBHOOKS,
    Permission.MANAGE_ALERTS,
    Permission.VIEW_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_NETWORK_SETTINGS,
  ],
  OWNER: ALL_PERMISSIONS,
} as const;
