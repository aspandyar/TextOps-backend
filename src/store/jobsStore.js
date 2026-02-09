import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.JOBS_DATA_DIR || path.join(__dirname, '../../data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load jobs from disk. Returns [] if file missing or invalid.
 */
export function loadJobs() {
  try {
    ensureDataDir();
    if (!fs.existsSync(JOBS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(JOBS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Could not load jobs from disk:', err.message);
    return [];
  }
}

/**
 * Persist jobs to disk so they survive server restart.
 */
export function saveJobs(jobs) {
  try {
    ensureDataDir();
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save jobs to disk:', err.message);
  }
}
