import bcrypt from 'bcryptjs';
import { getPool } from './connection.js';
import { findByEmail, create } from './usersRepository.js';
import logger from '../logger.js';

/**
 * Ensure admin user exists from env (ADMIN_EMAIL, ADMIN_PASSWORD).
 * If user with that email exists, skip and log. If not, create and log.
 */
export async function ensureAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    logger.debug('ADMIN_EMAIL or ADMIN_PASSWORD not set; skipping admin seed');
    return;
  }
  const pool = getPool();
  if (!pool) {
    logger.warn('Database not configured; skipping admin seed');
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await findByEmail(normalizedEmail);
  if (existing) {
    logger.info({ email: normalizedEmail }, 'Admin user already exists, skipping creation');
    return;
  }
  const id = String(Date.now());
  const passwordHash = bcrypt.hashSync(password, 10);
  await create({
    id,
    email: normalizedEmail,
    passwordHash,
    role: 'admin',
  });
  logger.info({ email: normalizedEmail, userId: id }, 'Admin user created from env');
}
