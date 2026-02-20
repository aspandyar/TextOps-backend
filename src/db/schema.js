import { getPool } from './connection.js';
import logger from '../logger.js';

export async function initSchema() {
  const pool = getPool();
  if (!pool) {
    logger.warn('Database not configured; skipping schema init');
    return false;
  }
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size BIGINT,
        file_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        progress INTEGER NOT NULL DEFAULT 0,
        options JSONB DEFAULT '{}',
        result JSONB,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
    `);
    logger.info('Database schema initialized');
    return true;
  } catch (err) {
    logger.error({ err }, 'Schema init failed');
    throw err;
  } finally {
    client.release();
  }
}
