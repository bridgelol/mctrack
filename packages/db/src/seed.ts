import { db, users, networks, networkRoles, networkMembers, apiKeys, gamemodes } from './postgres/index.js';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

// Fixed dev credentials - these are used in plugin configs
const DEV_NETWORK_ID = '00000000-0000-0000-0000-000000000001';

// Gamemode IDs (fixed for consistency)
const DEV_GAMEMODE_IDS = {
  survival: '00000000-0000-0000-0000-000000000011',
  skyblock: '00000000-0000-0000-0000-000000000012',
  prison: '00000000-0000-0000-0000-000000000013',
};

// API Keys for each server (proxy + gamemodes)
// In a real setup:
// - Proxy (BungeeCord/Velocity) uses the network-level key to track joins/leaves
// - Each Paper server uses a gamemode-specific key to track gamemode activity
const DEV_API_KEYS = {
  proxy: 'mct_dev_proxy_key_12345678',      // For BungeeCord/Velocity proxy
  survival: 'mct_dev_survival_key_12345',   // For Survival Paper server
  skyblock: 'mct_dev_skyblock_key_12345',   // For SkyBlock Paper server
  prison: 'mct_dev_prison_key_1234567',     // For Prison Paper server
};

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

const DEV_USER = {
  email: 'dev@mctrack.local',
  password: 'password123',
  username: 'devuser',
};

const DEV_NETWORK = {
  id: DEV_NETWORK_ID,
  name: 'Dev Network',
  timezone: 'UTC',
};

// Gamemode definitions for a typical multi-server setup
const DEV_GAMEMODES = [
  { id: DEV_GAMEMODE_IDS.survival, name: 'Survival' },
  { id: DEV_GAMEMODE_IDS.skyblock, name: 'SkyBlock' },
  { id: DEV_GAMEMODE_IDS.prison, name: 'Prison' },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Check if dev user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, DEV_USER.email),
  });

  let userId: string;

  if (existingUser) {
    console.log('✓ Dev user already exists');
    userId = existingUser.id;
  } else {
    // Create dev user
    const passwordHash = await bcrypt.hash(DEV_USER.password, 12);
    const [newUser] = await db.insert(users).values({
      email: DEV_USER.email,
      passwordHash,
      username: DEV_USER.username,
      emailVerified: true,
    }).returning();

    userId = newUser.id;
    console.log('✓ Created dev user:', DEV_USER.email);
  }

  // Check if dev network already exists
  const existingNetwork = await db.query.networks.findFirst({
    where: eq(networks.id, DEV_NETWORK_ID),
  });

  if (!existingNetwork) {
    // Create dev network with fixed ID
    const [network] = await db.insert(networks).values({
      id: DEV_NETWORK.id,
      name: DEV_NETWORK.name,
      ownerId: userId,
      timezone: DEV_NETWORK.timezone,
      settings: {
        paymentProviders: {
          tebex: { enabled: false, secretKey: '', lastSync: null },
          paynow: { enabled: false, apiKey: '', lastSync: null },
        },
      },
    }).returning();

    // Create default roles
    const defaultRoles = [
      {
        networkId: network.id,
        name: 'Admin',
        color: '#ef4444',
        permissions: [
          'view_dashboard', 'view_advanced_analytics', 'export_data',
          'view_players', 'view_player_details', 'view_payments',
          'view_campaigns', 'manage_campaigns', 'manage_gamemodes',
          'manage_api_keys', 'manage_webhooks', 'manage_alerts',
          'view_team', 'invite_members', 'remove_members', 'manage_roles',
          'manage_network_settings',
        ],
        isDefault: false,
      },
      {
        networkId: network.id,
        name: 'Moderator',
        color: '#f59e0b',
        permissions: [
          'view_dashboard', 'view_players', 'view_player_details',
          'view_campaigns', 'view_team',
        ],
        isDefault: false,
      },
      {
        networkId: network.id,
        name: 'Viewer',
        color: '#6366f1',
        permissions: ['view_dashboard'],
        isDefault: true,
      },
    ];

    await db.insert(networkRoles).values(defaultRoles);

    // Add owner as member with Admin role
    const adminRole = await db.query.networkRoles.findFirst({
      where: eq(networkRoles.name, 'Admin'),
    });

    if (adminRole) {
      await db.insert(networkMembers).values({
        networkId: network.id,
        userId: userId,
        roleId: adminRole.id,
      });
    }

    console.log('✓ Created dev network:', DEV_NETWORK.name);
  } else {
    console.log('✓ Dev network already exists');
  }

  // Create gamemodes (if they don't exist)
  for (const gamemode of DEV_GAMEMODES) {
    const existing = await db.query.gamemodes.findFirst({
      where: eq(gamemodes.id, gamemode.id),
    });
    if (!existing) {
      await db.insert(gamemodes).values({
        id: gamemode.id,
        networkId: DEV_NETWORK_ID,
        name: gamemode.name,
      });
      console.log(`✓ Created gamemode: ${gamemode.name}`);
    }
  }

  // Create proxy API key (network-level, no gamemode) if it doesn't exist
  const proxyKeyHash = hashApiKey(DEV_API_KEYS.proxy);
  const existingProxyKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, proxyKeyHash),
  });
  if (!existingProxyKey) {
    await db.insert(apiKeys).values({
      networkId: DEV_NETWORK_ID,
      keyHash: proxyKeyHash,
      keyPrefix: DEV_API_KEYS.proxy.substring(0, 12),
      name: 'Proxy Server',
    });
    console.log('✓ Created proxy API key');
  }

  // Create gamemode-specific API keys (if they don't exist)
  const gamemodeKeyMap: { key: keyof typeof DEV_API_KEYS; gamemodeId: string; name: string }[] = [
    { key: 'survival', gamemodeId: DEV_GAMEMODE_IDS.survival, name: 'Survival Server' },
    { key: 'skyblock', gamemodeId: DEV_GAMEMODE_IDS.skyblock, name: 'SkyBlock Server' },
    { key: 'prison', gamemodeId: DEV_GAMEMODE_IDS.prison, name: 'Prison Server' },
  ];

  for (const { key, gamemodeId, name } of gamemodeKeyMap) {
    const keyHash = hashApiKey(DEV_API_KEYS[key]);
    const existingKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyHash, keyHash),
    });
    if (!existingKey) {
      await db.insert(apiKeys).values({
        networkId: DEV_NETWORK_ID,
        gamemodeId,
        keyHash,
        keyPrefix: DEV_API_KEYS[key].substring(0, 12),
        name,
      });
      console.log(`✓ Created API key: ${name}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 DEV CREDENTIALS');
  console.log('='.repeat(60));
  console.log(`   Email:      ${DEV_USER.email}`);
  console.log(`   Password:   ${DEV_USER.password}`);

  console.log('\n' + '='.repeat(60));
  console.log('🖥️  PROXY SERVER CONFIG (BungeeCord/Velocity)');
  console.log('='.repeat(60));
  console.log('   This tracks player joins/leaves at the network level.');
  console.log(`   API Key:    ${DEV_API_KEYS.proxy}`);
  console.log(`   Network ID: ${DEV_NETWORK_ID}`);

  console.log('\n' + '='.repeat(60));
  console.log('🎮 PAPER SERVER CONFIGS (Gamemodes)');
  console.log('='.repeat(60));
  console.log('   Each Paper server uses a gamemode-specific key to track');
  console.log('   activity on that specific gamemode.\n');

  console.log('   [Survival Server]');
  console.log(`   API Key:     ${DEV_API_KEYS.survival}`);
  console.log(`   Network ID:  ${DEV_NETWORK_ID}`);
  console.log(`   Gamemode ID: ${DEV_GAMEMODE_IDS.survival}\n`);

  console.log('   [SkyBlock Server]');
  console.log(`   API Key:     ${DEV_API_KEYS.skyblock}`);
  console.log(`   Network ID:  ${DEV_NETWORK_ID}`);
  console.log(`   Gamemode ID: ${DEV_GAMEMODE_IDS.skyblock}\n`);

  console.log('   [Prison Server]');
  console.log(`   API Key:     ${DEV_API_KEYS.prison}`);
  console.log(`   Network ID:  ${DEV_NETWORK_ID}`);
  console.log(`   Gamemode ID: ${DEV_GAMEMODE_IDS.prison}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Seeding complete!');
  console.log('='.repeat(60));
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
