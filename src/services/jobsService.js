import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTextStats } from '../algorithms/textStats.js';
import * as jobsRepo from '../db/jobsRepository.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function listJobs({ userId, isAdmin, status, type } = {}) {
  return jobsRepo.list({ userId, isAdmin, status, type });
}

export async function getJobById(id, { userId, isAdmin } = {}) {
  return jobsRepo.getById(id, { userId, isAdmin });
}

export async function createJob({ userId, filePath, originalname, size, jobType, options = {} }) {
  const id = String(Date.now());
  return jobsRepo.create({
    id,
    userId: userId || null,
    type: jobType,
    fileName: originalname,
    fileSize: size,
    filePath,
    options,
  });
}

export async function updateJob(id, updates) {
  return jobsRepo.update(id, updates);
}

export async function cancelJob(id, { userId, isAdmin } = {}) {
  const job = await jobsRepo.getById(id, { userId, isAdmin });
  if (!job) return null;
  if (job.status === 'completed' || job.status === 'cancelled') return null;
  await jobsRepo.update(id, { status: 'cancelled' });
  return jobsRepo.getById(id);
}

export async function deleteJob(id, { removeFile = true, userId, isAdmin } = {}) {
  const job = await jobsRepo.getById(id, { userId, isAdmin });
  if (!job) return false;
  if (removeFile && job.filePath && fs.existsSync(job.filePath)) {
    try {
      fs.unlinkSync(job.filePath);
    } catch (err) {
      logger.error({ err, filePath: job.filePath }, 'Failed to delete job file');
    }
  }
  return jobsRepo.remove(id);
}

export async function getJobResult(id, { userId, isAdmin } = {}) {
  const job = await jobsRepo.getById(id, { userId, isAdmin });
  if (!job || job.status !== 'completed') return null;
  return {
    id: job.id,
    result: job.result,
    completedAt: job.completedAt,
  };
}

export function processFileWithAlgorithms(filePath, jobType) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const stats = getTextStats(content);
  return { stats, raw: content };
}
