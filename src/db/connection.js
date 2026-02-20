import pg from 'pg';
import logger from '../logger.js';

const { Pool } = pg;

let pool = null;

/**
 * Get or create the database connection pool.
 * Returns null if DB_* env vars are not set.
 */
export function getPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !database || !user) {
    logger.warn('DB config missing (DB_HOST, DB_NAME, DB_USER). Running without database.');
    return null;
  }

  pool = new Pool({
    host,
    port: port ? parseInt(port, 10) : 5432,
    database,
    user,
    password: password || undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected DB pool error');
  });

  return pool;
}

/**
 * Test database connectivity. Resolves to true if connected, false if no pool.
 */
export async function testConnection() {
  const p = getPool();
  if (!p) return false;
  try {
    const client = await p.connect();
    client.release();
    return true;
  } catch (err) {
    logger.error({ err: err.message }, 'DB connection test failed');
    return false;
  }
}

export default { getPool, testConnection };
