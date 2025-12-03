import { createClient } from '@clickhouse/client';
import { CLICKHOUSE_DDL } from './clickhouse/schema.js';

async function migrateClickHouse() {
  const url = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
  const database = process.env.CLICKHOUSE_DATABASE || 'mctrack';

  console.log('🚀 Starting ClickHouse migration...');
  console.log(`   URL: ${url}`);
  console.log(`   Database: ${database}`);

  // First, connect without a database to create the database
  const systemClient = createClient({
    url,
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    request_timeout: 30000,
  });

  try {
    // Create database if it doesn't exist
    console.log(`\n📦 Creating database "${database}" if not exists...`);
    await systemClient.command({
      query: `CREATE DATABASE IF NOT EXISTS ${database}`,
    });
    console.log(`   ✓ Database "${database}" ready`);

    // Close system client
    await systemClient.close();

    const dbClient = createClient({
      url,
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: database,
      request_timeout: 30000,
    });

    // Parse and execute DDL statements
    console.log('\n📋 Executing DDL statements...');

    // Remove comments and split by semicolons
    const cleanedDDL = CLICKHOUSE_DDL
      .split('\n')
      .map((line) => line.startsWith('--') ? '' : line)
      .join('\n');

    const statements = cleanedDDL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes('CREATE TABLE'));

    for (const statement of statements) {
      // Extract table name for logging
      const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      const tableName = tableMatch ? tableMatch[1] : 'unknown';

      try {
        await dbClient.command({ query: statement });
        console.log(`   ✓ Created table: ${tableName}`);
      } catch (error: unknown) {
        const err = error as Error;
        // Ignore "table already exists" errors
        if (err.message?.includes('already exists')) {
          console.log(`   ○ Table exists: ${tableName}`);
        } else {
          throw error;
        }
      }
    }

    await dbClient.close();

    console.log('\n✅ ClickHouse migration complete!');
  } catch (error) {
    console.error('\n❌ ClickHouse migration failed:', error);
    // Try to close any open clients
    try {
      await systemClient.close();
    } catch {
      // Ignore close errors
    }
    process.exit(1);
  }
}

migrateClickHouse()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
