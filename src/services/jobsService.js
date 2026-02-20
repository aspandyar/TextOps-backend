import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getTextStats } from '../algorithms/textStats.js';
import { loadJobs, saveJobs } from '../store/jobsStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for jobs, loaded from disk so they survive server restart
let jobs = loadJobs();

/**
 * List jobs with optional filters. If isAdmin is false, only jobs for userId are returned.
 */
export function listJobs({ userId, isAdmin, status, type } = {}) {
  let filtered = [...jobs];
  if (!isAdmin && userId) {
    filtered = filtered.filter((j) => j.userId === userId);
  }
  if (status) filtered = filtered.filter((j) => j.status === status);
  if (type) filtered = filtered.filter((j) => j.type === type);
  return filtered;
}

/**
 * Get a single job by id. If userId and isAdmin are provided, enforces access (user owns job or is admin).
 */
export function getJobById(id, { userId, isAdmin } = {}) {
  const job = jobs.find((j) => j.id === id) ?? null;
  if (!job) return null;
  if (userId !== undefined && !isAdmin && job.userId !== userId) return null;
  return job;
}

/**
 * Create a new job from upload info. Returns the created job.
 */
export function createJob({ userId, filePath, originalname, size, jobType, options = {} }) {
  const id = String(Date.now());
  const job = {
    id,
    userId: userId || null,
    type: jobType,
    fileName: originalname,
    fileSize: size,
    filePath,
    status: 'pending',
    progress: 0,
    options,
    result: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
  jobs.push(job);
  saveJobs(jobs);
  return job;
}

/**
 * Update an existing job by id. Merges updates and persists.
 */
export function updateJob(id, updates) {
  const job = getJobById(id);
  if (!job) return null;
  Object.assign(job, updates, { updatedAt: new Date().toISOString() });
  saveJobs(jobs);
  return job;
}

/**
 * Cancel a job. Returns the updated job or null if not found / already terminal. Enforces access if userId/isAdmin provided.
 */
export function cancelJob(id, { userId, isAdmin } = {}) {
  const job = getJobById(id, { userId, isAdmin });
  if (!job) return null;
  if (job.status === 'completed' || job.status === 'cancelled') return null;
  job.status = 'cancelled';
  job.updatedAt = new Date().toISOString();
  saveJobs(jobs);
  return job;
}

/**
 * Delete a job and optionally remove its file from disk. Returns true if deleted. Enforces access if userId/isAdmin provided.
 */
export function deleteJob(id, { removeFile = true, userId, isAdmin } = {}) {
  const job = getJobById(id, { userId, isAdmin });
  if (!job) return false;
  const index = jobs.findIndex((j) => j.id === id);
  if (index === -1) return false;
  const jobAt = jobs[index];
  if (removeFile && jobAt.filePath && fs.existsSync(jobAt.filePath)) {
    try {
      fs.unlinkSync(jobAt.filePath);
    } catch (err) {
      console.error('Failed to delete job file:', jobAt.filePath, err);
    }
  }
  jobs.splice(index, 1);
  saveJobs(jobs);
  return true;
}

/**
 * Get result payload for a completed job. Returns null if not found or not completed. Enforces access if userId/isAdmin provided.
 */
export function getJobResult(id, { userId, isAdmin } = {}) {
  const job = getJobById(id, { userId, isAdmin });
  if (!job || job.status !== 'completed') return null;
  return {
    id: job.id,
    result: job.result,
    completedAt: job.completedAt,
  };
}

/**
 * Run text stats (counting) on file content. Used when processing a job.
 */
export function processFileWithAlgorithms(filePath, jobType) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const stats = getTextStats(content);
  return { stats, raw: content };
}
