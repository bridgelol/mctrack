import { insert } from '@mctrack/db/clickhouse';
import { NetworkSession, GameModeSession } from '@mctrack/db/clickhouse';
import { logger } from '../lib/logger.js';

// Convert Date to ClickHouse DateTime64 format: "2025-12-03 00:49:40.000"
function formatDateForClickHouse(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

interface SessionBuffer {
  sessions: NetworkSession[];
  gamemodeSessions: GameModeSession[];
  lastFlush: number;
}

const buffer: SessionBuffer = {
  sessions: [],
  gamemodeSessions: [],
  lastFlush: Date.now(),
};

const FLUSH_INTERVAL_MS = 1000; // Flush every second
const MAX_BUFFER_SIZE = 1000; // Or when buffer reaches 1000 items

let flushInterval: NodeJS.Timeout | null = null;

/**
 * Add a network session to the buffer
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
 * Add a gamemode session to the buffer
 */
export function addGamemodeSession(session: GameModeSession): void {
  buffer.gamemodeSessions.push(session);

  // Flush if buffer is full
  if (buffer.gamemodeSessions.length >= MAX_BUFFER_SIZE) {
    flushBuffer().catch((err) => {
      logger.error({ err }, 'Failed to flush buffer');
    });
  }
}

/**
 * Flush the buffer to ClickHouse
 */
export async function flushBuffer(): Promise<void> {
  const hasNetworkSessions = buffer.sessions.length > 0;
  const hasGamemodeSessions = buffer.gamemodeSessions.length > 0;

  if (!hasNetworkSessions && !hasGamemodeSessions) return;

  buffer.lastFlush = Date.now();

  // Flush network sessions
  if (hasNetworkSessions) {
    const sessionsToFlush = [...buffer.sessions];
    buffer.sessions = [];

    try {
      const formattedSessions = sessionsToFlush.map(session => ({
        ...session,
        start_time: formatDateForClickHouse(session.start_time),
        end_time: formatDateForClickHouse(session.end_time),
        last_heartbeat: formatDateForClickHouse(session.last_heartbeat || session.start_time),
      }));
      await insert('network_sessions', formattedSessions as any[]);
      logger.debug({ count: sessionsToFlush.length }, 'Flushed network sessions to ClickHouse');
    } catch (error) {
      logger.error({ error, count: sessionsToFlush.length }, 'Failed to flush network sessions');
      buffer.sessions.unshift(...sessionsToFlush);
    }
  }

  // Flush gamemode sessions
  if (hasGamemodeSessions) {
    const gamemodeSessionsToFlush = [...buffer.gamemodeSessions];
    buffer.gamemodeSessions = [];

    try {
      const formattedSessions = gamemodeSessionsToFlush.map(session => ({
        ...session,
        start_time: formatDateForClickHouse(session.start_time),
        end_time: formatDateForClickHouse(session.end_time),
      }));
      await insert('gamemode_sessions', formattedSessions as any[]);
      logger.debug({ count: gamemodeSessionsToFlush.length }, 'Flushed gamemode sessions to ClickHouse');
    } catch (error) {
      logger.error({ error, count: gamemodeSessionsToFlush.length }, 'Failed to flush gamemode sessions');
      buffer.gamemodeSessions.unshift(...gamemodeSessionsToFlush);
    }
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
export function getBufferStats(): { networkSessions: number; gamemodeSessions: number; lastFlush: number } {
  return {
    networkSessions: buffer.sessions.length,
    gamemodeSessions: buffer.gamemodeSessions.length,
    lastFlush: buffer.lastFlush,
  };
}
