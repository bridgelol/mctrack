import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  decimal,
  date,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['member', 'admin']);
export const platformEnum = pgEnum('platform', ['java', 'bedrock']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'past_due']);
export const budgetTypeEnum = pgEnum('budget_type', ['daily', 'total']);

// ============================================================================
// USERS & AUTH
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  signUpTime: timestamp('sign_up_time').notNull().defaultNow(),
  lastLogin: timestamp('last_login'),
  emailVerified: boolean('email_verified').notNull().default(false),
  role: userRoleEnum('role').notNull().default('member'),
}, (table) => [
  index('users_email_idx').on(table.email),
]);

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'discord', 'google', 'credentials'
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('accounts_user_id_idx').on(table.userId),
]);

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  expiryTime: timestamp('expiry_time'),
}, (table) => [
  index('subscriptions_user_id_idx').on(table.userId),
]);

// ============================================================================
// NETWORKS
// ============================================================================

export const networks = pgTable('networks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  creationTime: timestamp('creation_time').notNull().defaultNow(),
  settings: jsonb('settings').$type<{
    paymentProviders?: {
      tebex?: { enabled: boolean; secretKey: string; lastSync: string | null };
      paynow?: { enabled: boolean; apiKey: string; lastSync: string | null };
    };
    paymentSyncIntervalMinutes?: number;
  }>().default({}),
}, (table) => [
  index('networks_owner_id_idx').on(table.ownerId),
]);

export const networkRoles = pgTable('network_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('network_roles_network_id_idx').on(table.networkId),
]);

export const networkMembers = pgTable('network_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => networkRoles.id),
  invitedBy: uuid('invited_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('network_members_network_id_idx').on(table.networkId),
  index('network_members_user_id_idx').on(table.userId),
]);

export const networkInvitations = pgTable('network_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  roleId: uuid('role_id').notNull().references(() => networkRoles.id),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('network_invitations_token_idx').on(table.token),
  index('network_invitations_network_id_idx').on(table.networkId),
]);

// ============================================================================
// API KEYS
// ============================================================================

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  gamemodeId: uuid('gamemode_id').references(() => gamemodes.id, { onDelete: 'set null' }),
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(), // mct_ + 8 chars
  name: varchar('name', { length: 100 }).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
}, (table) => [
  index('api_keys_key_hash_idx').on(table.keyHash),
  index('api_keys_network_id_idx').on(table.networkId),
]);

// ============================================================================
// GAMEMODES
// ============================================================================

export const gamemodes = pgTable('gamemodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  creationTime: timestamp('creation_time').notNull().defaultNow(),
}, (table) => [
  index('gamemodes_network_id_idx').on(table.networkId),
]);

// ============================================================================
// PLAYERS
// ============================================================================

export const players = pgTable('players', {
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  playerUuid: varchar('player_uuid', { length: 36 }).notNull(),
  playerName: varchar('player_name', { length: 16 }).notNull(),
  skinTextures: text('skin_textures'),
  platform: platformEnum('platform').notNull(),
  bedrockDevice: varchar('bedrock_device', { length: 20 }),
  country: varchar('country', { length: 2 }).notNull(),
  firstSeen: timestamp('first_seen').notNull().defaultNow(),
  lastSeen: timestamp('last_seen').notNull().defaultNow(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
}, (table) => [
  primaryKey({ columns: [table.networkId, table.playerUuid] }),
  index('players_network_id_idx').on(table.networkId),
  index('players_last_seen_idx').on(table.lastSeen),
  index('players_campaign_id_idx').on(table.campaignId),
]);

// ============================================================================
// CAMPAIGNS
// ============================================================================

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  domainFilter: varchar('domain_filter', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  budgetType: budgetTypeEnum('budget_type').notNull(),
  budgetAmount: decimal('budget_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  archivedAt: timestamp('archived_at'),
}, (table) => [
  index('campaigns_network_id_idx').on(table.networkId),
  index('campaigns_dates_idx').on(table.startDate, table.endDate),
]);

export const campaignSpends = pgTable('campaign_spends', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('campaign_spends_campaign_id_idx').on(table.campaignId),
]);

// ============================================================================
// WEBHOOKS
// ============================================================================

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  url: text('url').notNull(),
  secret: varchar('secret', { length: 64 }),
  events: jsonb('events').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  failureCount: decimal('failure_count', { precision: 10, scale: 0 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('webhooks_network_id_idx').on(table.networkId),
]);

// ============================================================================
// ALERTS
// ============================================================================

export const alertConditionEnum = pgEnum('alert_condition', ['gt', 'lt', 'eq', 'gte', 'lte']);

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  metric: varchar('metric', { length: 50 }).notNull(),
  condition: alertConditionEnum('condition').notNull(),
  threshold: decimal('threshold', { precision: 10, scale: 2 }).notNull(),
  timeWindow: decimal('time_window', { precision: 10, scale: 0 }).notNull().default('15'), // minutes
  channels: jsonb('channels').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('alerts_network_id_idx').on(table.networkId),
]);

// ============================================================================
// AUDIT LOG
// ============================================================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkId: uuid('network_id').notNull().references(() => networks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId: varchar('target_id', { length: 255 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => [
  index('audit_logs_network_id_idx').on(table.networkId),
  index('audit_logs_timestamp_idx').on(table.timestamp),
]);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  subscriptions: many(subscriptions),
  ownedNetworks: many(networks),
  memberships: many(networkMembers),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const networksRelations = relations(networks, ({ one, many }) => ({
  owner: one(users, { fields: [networks.ownerId], references: [users.id] }),
  roles: many(networkRoles),
  members: many(networkMembers),
  invitations: many(networkInvitations),
  apiKeys: many(apiKeys),
  gamemodes: many(gamemodes),
  players: many(players),
  campaigns: many(campaigns),
  webhooks: many(webhooks),
  alerts: many(alerts),
  auditLogs: many(auditLogs),
}));

export const networkRolesRelations = relations(networkRoles, ({ one, many }) => ({
  network: one(networks, { fields: [networkRoles.networkId], references: [networks.id] }),
  members: many(networkMembers),
}));

export const networkMembersRelations = relations(networkMembers, ({ one }) => ({
  network: one(networks, { fields: [networkMembers.networkId], references: [networks.id] }),
  user: one(users, { fields: [networkMembers.userId], references: [users.id] }),
  role: one(networkRoles, { fields: [networkMembers.roleId], references: [networkRoles.id] }),
  inviter: one(users, { fields: [networkMembers.invitedBy], references: [users.id] }),
}));

export const gamemodesRelations = relations(gamemodes, ({ one, many }) => ({
  network: one(networks, { fields: [gamemodes.networkId], references: [networks.id] }),
  apiKeys: many(apiKeys),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  network: one(networks, { fields: [apiKeys.networkId], references: [networks.id] }),
  gamemode: one(gamemodes, { fields: [apiKeys.gamemodeId], references: [gamemodes.id] }),
}));

export const playersRelations = relations(players, ({ one }) => ({
  network: one(networks, { fields: [players.networkId], references: [networks.id] }),
  campaign: one(campaigns, { fields: [players.campaignId], references: [campaigns.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  network: one(networks, { fields: [campaigns.networkId], references: [networks.id] }),
  spends: many(campaignSpends),
  players: many(players),
}));

export const campaignSpendsRelations = relations(campaignSpends, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignSpends.campaignId], references: [campaigns.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  network: one(networks, { fields: [webhooks.networkId], references: [networks.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  network: one(networks, { fields: [alerts.networkId], references: [networks.id] }),
}));

export const networkInvitationsRelations = relations(networkInvitations, ({ one }) => ({
  network: one(networks, { fields: [networkInvitations.networkId], references: [networks.id] }),
  role: one(networkRoles, { fields: [networkInvitations.roleId], references: [networkRoles.id] }),
  inviter: one(users, { fields: [networkInvitations.invitedBy], references: [users.id] }),
}));
