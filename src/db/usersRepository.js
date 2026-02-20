import { getPool } from './connection.js';
import logger from '../logger.js';

export async function findByEmail(email) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function findById(id) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function count() {
  const pool = getPool();
  if (!pool) return 0;
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  return rows[0]?.c ?? 0;
}

export async function create({ id, email, passwordHash, role }) {
  const pool = getPool();
  if (!pool) throw new Error('Database not configured');
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)`,
    [id, email, passwordHash, role]
  );
  const user = await findById(id);
  logger.debug({ userId: id, email }, 'User created');
  return user;
}
