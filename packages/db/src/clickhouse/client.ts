import { createClient, ClickHouseClient } from '@clickhouse/client';

let clickhouseClient: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (!clickhouseClient) {
    clickhouseClient = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DATABASE || 'mctrack',
      request_timeout: 30000,
      compression: {
        request: true,
        response: true,
      },
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 0,
      },
    });
  }
  return clickhouseClient;
}

export async function closeClickHouseClient(): Promise<void> {
  if (clickhouseClient) {
    await clickhouseClient.close();
    clickhouseClient = null;
  }
}

// Typed query helper
export async function query<T>(
  sql: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const client = getClickHouseClient();
  const result = await client.query({
    query: sql,
    query_params: params,
    format: 'JSONEachRow',
  });
  return result.json<T>();
}

// Insert helper
export async function insert<T extends Record<string, unknown>>(
  table: string,
  values: T[]
): Promise<void> {
  if (values.length === 0) return;

  const client = getClickHouseClient();
  await client.insert({
    table,
    values,
    format: 'JSONEachRow',
  });
}

// Command helper (for DDL)
export async function command(sql: string): Promise<void> {
  const client = getClickHouseClient();
  await client.command({ query: sql });
}

export { ClickHouseClient };
