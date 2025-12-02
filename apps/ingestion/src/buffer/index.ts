import { insert } from '@mctrack/db/clickhouse';
import { NetworkSession } from '@mctrack/db/clickhouse';
import { logger } from '../lib/logger.js';

interface SessionBuffer {
  sessions: NetworkSession[];
  lastFlush: number;
}

const buffer: SessionBuffer = {
  sessions: [],
  lastFlush: Date.now(),
};

const FLUSH_INTERVAL_MS = 1000; // Flush every second
const MAX_BUFFER_SIZE = 1000; // Or when buffer reaches 1000 items

let flushInterval: NodeJS.Timeout | null = null;

/**
 * Add a session to the buffer
 */
export function addSession(session: NetworkSession): void {
  buffer.sessions.push(session);

  // Flush if buffer is full
  if (buffer.sessions.length >= MAX_BUFFER_SIZE) {
    flushBuffer().catch((err) => {
      logger.error({ err }, 'Failed to flush buffer');
    });
  }
}

/**
 * Flush the buffer to ClickHouse
 */
export async function flushBuffer(): Promise<void> {
  if (buffer.sessions.length === 0) return;

  const sessionsToFlush = [...buffer.sessions];
  buffer.sessions = [];
  buffer.lastFlush = Date.now();

  try {
    await insert('network_sessions', sessionsToFlush as any[]);
    logger.debug({ count: sessionsToFlush.length }, 'Flushed sessions to ClickHouse');
  } catch (error) {
    logger.error({ error, count: sessionsToFlush.length }, 'Failed to flush sessions');
    // Re-add failed sessions to buffer for retry
    buffer.sessions.unshift(...sessionsToFlush);
  }
}

/**
 * Start the periodic buffer flush
 */
export function startBufferFlush(): void {
  if (flushInterval) return;

  flushInterval = setInterval(() => {
    flushBuffer().catch((err) => {
      logger.error({ err }, 'Periodic flush failed');
    });
  }, FLUSH_INTERVAL_MS);

  logger.info('Buffer flush started');
}

/**
 * Stop the periodic buffer flush and flush remaining items
 */
export async function stopBufferFlush(): Promise<void> {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }

  // Flush any remaining items
  await flushBuffer();
  logger.info('Buffer flush stopped');
}

/**
 * Get buffer stats for monitoring
 */
export function getBufferStats(): { size: number; lastFlush: number } {
  return {
    size: buffer.sessions.length,
    lastFlush: buffer.lastFlush,
  };
}
