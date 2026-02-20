import { getPool } from './connection.js';
import logger from '../logger.js';

function rowToJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    fileName: row.file_name,
    fileSize: row.file_size ? Number(row.file_size) : null,
    filePath: row.file_path,
    status: row.status,
    progress: row.progress ?? 0,
    options: row.options || {},
    result: row.result,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function list({ userId, isAdmin, status, type } = {}) {
  const pool = getPool();
  if (!pool) return [];
  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];
  let n = 1;
  if (userId !== undefined && !isAdmin) {
    query += ` AND user_id = $${n++}`;
    params.push(userId);
  }
  if (status) {
    query += ` AND status = $${n++}`;
    params.push(status);
  }
  if (type) {
    query += ` AND type = $${n++}`;
    params.push(type);
  }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  return rows.map(rowToJob);
}

export async function getById(id, { userId, isAdmin } = {}) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
  const job = rowToJob(rows[0]);
  if (!job) return null;
  if (userId !== undefined && !isAdmin && job.userId !== userId) return null;
  return job;
}

export async function create({ id, userId, type, fileName, fileSize, filePath, options = {} }) {
  const pool = getPool();
  if (!pool) throw new Error('Database not configured');
  await pool.query(
    `INSERT INTO jobs (id, user_id, type, file_name, file_size, file_path, status, progress, options)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0, $7::jsonb)`,
    [id, userId || null, type, fileName, fileSize ?? null, filePath || null, JSON.stringify(options)]
  );
  const job = await getById(id);
  logger.debug({ jobId: id, userId }, 'Job created');
  return job;
}

const UPDATE_KEYS = {
  status: 'status',
  progress: 'progress',
  result: 'result',
  errorMessage: 'error_message',
  completedAt: 'completed_at',
};

export async function update(id, updates) {
  const pool = getPool();
  if (!pool) return null;
  const setClause = [];
  const params = [];
  let n = 1;
  for (const [key, value] of Object.entries(updates)) {
    const col = UPDATE_KEYS[key] || key;
    if (['status', 'progress', 'result', 'error_message', 'completed_at'].includes(col)) {
      setClause.push(`${col} = $${n++}`);
      params.push(col === 'result' && value != null ? JSON.stringify(value) : value);
    }
  }
  if (setClause.length === 0) return getById(id);
  setClause.push('updated_at = NOW()');
  params.push(id);
  await pool.query(
    `UPDATE jobs SET ${setClause.join(', ')} WHERE id = $${n}`,
    params
  );
  return getById(id);
}

export async function remove(id) {
  const pool = getPool();
  if (!pool) return false;
  const { rowCount } = await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
  return rowCount > 0;
}
