import { db, networks } from '@mctrack/db';
import { query as clickhouseQuery } from '@mctrack/db/clickhouse';
import { eq } from 'drizzle-orm';
import { getAdapter } from '../adapters/index.js';
import { NormalizedPayment } from '../types/provider.js';
import { logger } from '../lib/logger.js';

interface TebexConfig {
  enabled: boolean;
  secretKey: string;
  lastSync: string | null;
}

interface PayNowConfig {
  enabled: boolean;
  apiKey: string;
  lastSync: string | null;
}

interface NetworkSettings {
  paymentProviders?: {
    tebex?: TebexConfig;
    paynow?: PayNowConfig;
  };
  paymentSyncIntervalMinutes?: number;
}

export async function syncNetworkPayments(
  networkId: string,
  providerId?: string,
  fullSync: boolean = false
): Promise<void> {
  const network = await db.query.networks.findFirst({
    where: eq(networks.id, networkId),
  });

  if (!network) {
    throw new Error(`Network not found: ${networkId}`);
  }

  const settings = network.settings as NetworkSettings | null;
  const providers = settings?.paymentProviders || {};

  const providersToSync = providerId && providerId in providers
    ? { [providerId]: providers[providerId as keyof typeof providers] }
    : providers;

  for (const [name, config] of Object.entries(providersToSync)) {
    if (!config?.enabled) continue;

    try {
      logger.info({ networkId, provider: name }, 'Starting payment sync');

      const adapter = getAdapter(name as 'tebex' | 'paynow');
      await adapter.authenticate({
        apiKey: 'apiKey' in config ? config.apiKey : undefined,
        secretKey: 'secretKey' in config ? config.secretKey : undefined,
      });

      const lastSync = config.lastSync;
      const since = fullSync ? undefined : lastSync ? new Date(lastSync) : undefined;
      let cursor: string | undefined;
      let totalSynced = 0;

      do {
        const page = await adapter.fetchTransactions(since, cursor);

        if (page.transactions.length > 0) {
          await writePaymentsToClickhouse(networkId, page.transactions);
          totalSynced += page.transactions.length;
        }

        cursor = page.nextCursor;
      } while (cursor);

      // Update last sync time in the settings
      const updatedSettings = {
        ...settings,
        paymentProviders: {
          ...providers,
          [name]: {
            ...config,
            lastSync: new Date().toISOString(),
          },
        },
      };

      await db
        .update(networks)
        .set({ settings: updatedSettings })
        .where(eq(networks.id, networkId));

      logger.info({ networkId, provider: name, totalSynced }, 'Payment sync completed');
    } catch (error) {
      logger.error({ networkId, provider: name, error }, 'Payment sync failed');
      throw error;
    }
  }
}

export async function syncAllNetworks(): Promise<void> {
  const allNetworks = await db.query.networks.findMany();

  for (const network of allNetworks) {
    const settings = network.settings as NetworkSettings | null;
    const providers = settings?.paymentProviders || {};

    const hasEnabledProviders = Object.values(providers).some((p) => p?.enabled);
    if (!hasEnabledProviders) continue;

    try {
      await syncNetworkPayments(network.id);
    } catch (error) {
      logger.error({ networkId: network.id, error }, 'Failed to sync network payments');
      // Continue with other networks
    }
  }
}

async function writePaymentsToClickhouse(
  networkId: string,
  payments: NormalizedPayment[]
): Promise<void> {
  if (payments.length === 0) return;

  const values = payments.map((p) => ({
    network_id: networkId,
    payment_uuid: crypto.randomUUID(),
    merchant_payment_id: p.merchantPaymentId,
    player_name: p.playerName,
    player_uuid: p.playerUuid || '',
    platform: p.platform,
    bedrock_device: p.bedrockDevice || '',
    country: p.country,
    amount: p.amount,
    currency: p.currency,
    timestamp: p.timestamp.toISOString().replace('T', ' ').replace('Z', ''),
    products_dump_json: JSON.stringify(p.products),
  }));

  // Build INSERT query
  const columns = Object.keys(values[0]).join(', ');
  const placeholders = values
    .map(
      (v) =>
        `('${v.network_id}', '${v.payment_uuid}', '${v.merchant_payment_id}', '${v.player_name}', '${v.player_uuid}', '${v.platform}', '${v.bedrock_device}', '${v.country}', ${v.amount}, '${v.currency}', '${v.timestamp}', '${v.products_dump_json.replace(/'/g, "\\'")}')`
    )
    .join(', ');

  await clickhouseQuery(`
    INSERT INTO payments (${columns})
    VALUES ${placeholders}
  `);
}
