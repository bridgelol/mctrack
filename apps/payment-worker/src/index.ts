import cron from 'node-cron';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from './lib/logger.js';
import { syncNetworkPayments, syncAllNetworks } from './services/payment-sync.js';
import { runDailyAggregations } from './services/aggregations.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// BullMQ worker for manual sync jobs
const syncWorker = new Worker(
  'payment-sync',
  async (job) => {
    const { networkId, providerId, fullSync } = job.data;
    logger.info({ networkId, providerId, fullSync }, 'Processing payment sync job');

    await syncNetworkPayments(networkId, providerId, fullSync);

    return { success: true };
  },
  { connection: redis }
);

syncWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Payment sync job completed');
});

syncWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Payment sync job failed');
});

// Scheduled jobs

// Sync all networks every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  logger.info('Running scheduled payment sync for all networks');
  try {
    await syncAllNetworks();
  } catch (error) {
    logger.error({ error }, 'Scheduled payment sync failed');
  }
});

// Run daily aggregations at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  logger.info('Running daily aggregations');
  try {
    await runDailyAggregations();
  } catch (error) {
    logger.error({ error }, 'Daily aggregations failed');
  }
});

// Health check endpoint
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.PORT || 4002;
server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Payment worker started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down payment worker');
  await syncWorker.close();
  server.close();
  process.exit(0);
});
