# Database Schema

## PostgreSQL

### Site User
`id` - `email` - `username` - `sign_up_time` - `last_login` - `email_verified` - `role` (enum, default member)

### Network
`id` - `owner_id` - `name` - `timezone` - `creation_time` - `settings_json`

### Network Roles
`id` - `network_id` - `name` - `color` (hex) - `permissions` (jsonb array) - `is_default` - `created_at`

### Network Members
(`network_id` - `user_id`) - `role_id` - `invited_by` - `joined_at`

### Network Invitations
`id` - `network_id` - `email` - `role_id` - `invited_by` - `token` - `expires_at` - `created_at`

### API Keys
`id` - `network_id` - `gamemode_id` (nullable) - `key_hash` - `name` - `last_used_at` - `created_at` - `revoked_at` (nullable)

### Audit Log
`id` - `network_id` - `user_id` - `action` - `target_type` - `target_id` - `metadata_json` - `ip_address` - `timestamp`

### GameMode
`id` - `network_id` - `name` - `creation_time`

### Subscription
`subscription_id` - `user_id` - `type` - `status` (active, cancelled, past_due) - `stripe_customer_id` - `started_at` - `expiry_time`

### Players
(`network_id` - `player_uuid`) - `player_name` - `skin_textures` - `platform` (enum: java, bedrock) - `bedrock_device` (nullable, e.g. Android, iOS, Windows, PlayStation, Xbox, Switch) - `country` (first seen country) - `first_seen` - `last_seen` - `campaign_id` (nullable, first campaign attributed)

### Campaigns
`id` - `network_id` - `name` - `domain_filter` (nullable, null = all domains) - `start_date` - `end_date` - `budget_type` (enum: daily, total) - `budget_amount` - `currency` - `created_at` - `archived_at` (nullable)

### Campaign Spend
`id` - `campaign_id` - `date` - `amount` - `notes` (optional) - `created_at`

---

## ClickHouse

### Network Sessions
(`network_id` - `session_uuid`) - `player_uuid` - `proxy_id` (nullable) - `gamemode_id` (nullable) - `domain` - `ip_address` - `player_country` - `platform` (enum: java, bedrock) - `bedrock_device` (nullable) - `start_time` - `end_time` (optional)

### GameMode Sessions
(`gamemode_id` - `session_uuid`) - `player_uuid` - `server_name` (nullable) - `ip_address` - `player_country` - `start_time` - `end_time` (optional)

### Payments
(`network_id` - `payment_uuid`) - `merchant_payment_id` - `player_name` - `player_uuid` - `platform` - `bedrock_device` (nullable) - `country` - `amount` - `currency` - `timestamp` - `products_dump_json`

### Daily Rollups
(`network_id` - `date`) - `unique_players` - `total_sessions` - `total_playtime_minutes` - `peak_ccu` - `revenue`

### Daily Rollups (Segmented)
(`network_id` - `date` - `platform` - `bedrock_device` - `country`) - `unique_players` - `paying_players` - `total_sessions` - `total_playtime_minutes` - `peak_ccu` - `revenue`

Computed metrics (query-time):
- **ARPU** = revenue / unique_players
- **ARPPU** = revenue / paying_players

### Retention Cohorts
(`network_id` - `cohort_date` - `days_since`) - `cohort_size` - `returned_players`

### Retention Cohorts (Segmented)
(`network_id` - `cohort_date` - `days_since` - `platform` - `bedrock_device` - `country`) - `cohort_size` - `returned_players`

### LTV Cohorts
(`network_id` - `cohort_date` - `days_since`) - `cohort_size` - `paying_players` - `cumulative_revenue`

Tracks cumulative revenue at day N after first join. Common windows: D1, D7, D14, D30, D60, D90.

### LTV Cohorts (Segmented)
(`network_id` - `cohort_date` - `days_since` - `platform` - `bedrock_device` - `country`) - `cohort_size` - `paying_players` - `cumulative_revenue`

Computed metrics (query-time):
- **Cohorted LTV** = cumulative_revenue / cohort_size (revenue per user by day N)
- **Paying LTV** = cumulative_revenue / paying_players (revenue per paying user by day N)
- **Payer Conversion** = paying_players / cohort_size

---

## Notes

### Network Architectures

| Type | Setup | What They'd Use |
|------|-------|-----------------|
| **Large network** | Multiple proxies → Multiple gamemodes → Multiple instances | Network Sessions (`proxy_id`) + GameMode Sessions (`server_name`) |
| **Medium network** | Single proxy → Multiple gamemodes | Network Sessions + GameMode Sessions |
| **Small network** | Single proxy → Single gamemode | Network Sessions only |
| **Single server** | No proxy, standalone server | Network Sessions only |

### Session Usage by Setup

| Setup | Network Sessions | GameMode Sessions |
|-------|------------------|-------------------|
| Single server | `proxy_id`: null, `gamemode_id`: null | Not used |
| Single server, multiple worlds/modes | `proxy_id`: null, `gamemode_id`: set | Not used |
| Proxy + backends | `proxy_id`: optional, `gamemode_id`: null | Tracks backend time |
| Full multi-instance | `proxy_id`: set, `gamemode_id`: null | `server_name`: set |

### Session Logic

- **Network Sessions** = "Player connected to your network" (always used)
- **GameMode Sessions** = "Player on a specific backend server" (optional, proxy-based networks)
- `gamemode_id` on Network Sessions = shortcut for single-server setups that still want gamemode tracking without a second table

### CCU Calculation

CCU (Concurrent Users) is derived from sessions using `start_time` and `end_time`:

| Type | Method |
|------|--------|
| **Real-time CCU** | Count sessions where `end_time IS NULL` |
| **Historical CCU** | Count sessions where `start_time <= t AND (end_time IS NULL OR end_time >= t)` |
| **Peak CCU** | Time-bucket sampling (every minute) or event-based (+1/-1 running sum), take max |

Peak CCU is pre-computed in Daily Rollups during aggregation jobs.

### Campaign Attribution & ROI

- Players are **permanently** attributed to the first campaign that brought them in (`campaign_id` on Players table)
- This attribution persists even after the campaign expires
- **All payments** made by a player count toward their attributed campaign's ROI, regardless of when the payment occurs
- This allows accurate lifetime value (LTV) tracking per acquisition campaign

### Revenue Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **ARPU** | revenue / unique_players | Average Revenue Per User |
| **ARPPU** | revenue / paying_players | Average Revenue Per Paying User |
| **Payer Conversion** | paying_players / unique_players | % of players who made a purchase |

### LTV (Lifetime Value) Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **Cohorted LTV** | cumulative_revenue / cohort_size | Revenue per user by day N since first join |
| **LTV D7** | Revenue accumulated within 7 days of first join | Early monetization signal |
| **LTV D30** | Revenue accumulated within 30 days of first join | Medium-term value |
| **LTV D90** | Revenue accumulated within 90 days of first join | Long-term value indicator |

### Segmentation Dimensions

All metrics can be sliced by:

| Dimension | Values | Notes |
|-----------|--------|-------|
| **Platform** | `java`, `bedrock` | Client type |
| **Bedrock Device** | `Android`, `iOS`, `Windows`, `PlayStation`, `Xbox`, `Switch` | Only for bedrock players |
| **Country** | ISO country codes | Based on IP geolocation at first join |

Segmented tables use `bedrock_device = ''` (empty string) for Java players to keep a single table structure.

---

## Hardcoded Permissions
```typescript
export const Permission = {
    // Dashboard & Analytics
    VIEW_DASHBOARD: "view_dashboard",
    VIEW_ADVANCED_ANALYTICS: "view_advanced_analytics",
    EXPORT_DATA: "export_data",

    // Players
    VIEW_PLAYERS: "view_players",
    VIEW_PLAYER_DETAILS: "view_player_details",

    // Revenue
    VIEW_PAYMENTS: "view_payments",

    // Campaigns
    VIEW_CAMPAIGNS: "view_campaigns",
    MANAGE_CAMPAIGNS: "manage_campaigns",

    // Configuration
    MANAGE_GAMEMODES: "manage_gamemodes",
    MANAGE_API_KEYS: "manage_api_keys",
    MANAGE_WEBHOOKS: "manage_webhooks",
    MANAGE_ALERTS: "manage_alerts",

    // Team
    VIEW_TEAM: "view_team",
    INVITE_MEMBERS: "invite_members",
    REMOVE_MEMBERS: "remove_members",
    MANAGE_ROLES: "manage_roles",

    // Danger Zone
    MANAGE_NETWORK_SETTINGS: "manage_network_settings",
    DELETE_NETWORK: "delete_network",
    TRANSFER_OWNERSHIP: "transfer_ownership",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
```

---

## Hardcoded Audit Actions
```typescript
export const AuditAction = {
    // Team
    MEMBER_INVITED: "member_invited",
    MEMBER_REMOVED: "member_removed",
    MEMBER_ROLE_CHANGED: "member_role_changed",
    ROLE_CREATED: "role_created",
    ROLE_UPDATED: "role_updated",
    ROLE_DELETED: "role_deleted",

    // API Keys
    API_KEY_CREATED: "api_key_created",
    API_KEY_REVOKED: "api_key_revoked",

    // GameModes
    GAMEMODE_CREATED: "gamemode_created",
    GAMEMODE_UPDATED: "gamemode_updated",
    GAMEMODE_DELETED: "gamemode_deleted",

    // Network
    NETWORK_SETTINGS_UPDATED: "network_settings_updated",
    NETWORK_TRANSFERRED: "network_transferred",

    // Campaigns
    CAMPAIGN_CREATED: "campaign_created",
    CAMPAIGN_UPDATED: "campaign_updated",
    CAMPAIGN_ARCHIVED: "campaign_archived",
    CAMPAIGN_SPEND_LOGGED: "campaign_spend_logged",

    // Webhooks
    WEBHOOK_CREATED: "webhook_created",
    WEBHOOK_UPDATED: "webhook_updated",
    WEBHOOK_DELETED: "webhook_deleted",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
```