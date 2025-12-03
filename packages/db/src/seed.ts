import { db, users, networks, networkRoles, networkMembers, apiKeys } from './postgres/index.js';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

// Fixed dev credentials - these are used in plugin configs
const DEV_API_KEY = 'mct_dev_test_key_12345678';
const DEV_NETWORK_ID = '00000000-0000-0000-0000-000000000001';

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

  if (existingNetwork) {
    console.log('✓ Dev network already exists');
  } else {
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

    // Create dev API key
    const keyHash = hashApiKey(DEV_API_KEY);
    await db.insert(apiKeys).values({
      networkId: network.id,
      keyHash,
      keyPrefix: DEV_API_KEY.substring(0, 12),
      name: 'Dev API Key',
    });
    console.log('✓ Created dev API key');
  }

  console.log('\n📋 Dev credentials:');
  console.log(`   Email:      ${DEV_USER.email}`);
  console.log(`   Password:   ${DEV_USER.password}`);
  console.log('\n🔑 Plugin configuration:');
  console.log(`   API Key:    ${DEV_API_KEY}`);
  console.log(`   Network ID: ${DEV_NETWORK_ID}`);
  console.log('\n✅ Seeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
