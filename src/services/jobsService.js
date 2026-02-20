import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTextStats } from '../algorithms/textStats.js';
import { sortNumbers, removeDuplicates, cleanTrash } from '../algorithms/textProcessors.js';
import * as jobsRepo from '../db/jobsRepository.js';
import { uploadDir } from '../middleware/upload.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(uploadDir, 'output');
const MAX_OUTPUT_TEXT_BYTES = 1024 * 1024; // 1MB for /output text response

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
  const resultPath = job.result?.resultFilePath;
  if (removeFile && resultPath && fs.existsSync(resultPath)) {
    try {
      fs.unlinkSync(resultPath);
    } catch (err) {
      logger.error({ err, resultPath }, 'Failed to delete result file');
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

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

export function processFileWithAlgorithms(filePath, jobType, options = {}, originalname, jobId) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(originalname || path.basename(filePath)) || '.txt';
  let outputContent = content;
  let stats = getTextStats(content);

  if (jobType === 'sort') {
    outputContent = sortNumbers(content, options);
    stats = getTextStats(outputContent);
  } else if (jobType === 'dedup') {
    outputContent = removeDuplicates(content, options);
    stats = getTextStats(outputContent);
  } else if (jobType === 'clean') {
    outputContent = cleanTrash(content);
    stats = getTextStats(outputContent);
  }
  // wordcount: keep content as-is, stats only

  let resultFilePath = null;
  let resultFileName = null;
  if (jobType === 'sort' || jobType === 'dedup' || jobType === 'clean') {
    ensureOutputDir();
    resultFileName = `${path.basename(originalname || 'output', ext)}-result${ext}`;
    resultFilePath = path.join(OUTPUT_DIR, `${jobId}-${resultFileName}`);
    fs.writeFileSync(resultFilePath, outputContent, 'utf-8');
  }

  return {
    stats,
    resultFilePath: resultFilePath || undefined,
    resultFileName: resultFileName || undefined,
    outputLength: outputContent.length,
  };
}

export function getResultFileStream(jobId, { userId, isAdmin } = {}) {
  return (async () => {
    const job = await getJobById(jobId, { userId, isAdmin });
    if (!job || job.status !== 'completed' || !job.result?.resultFilePath) return null;
    const p = job.result.resultFilePath;
    if (!fs.existsSync(p)) return null;
    return { stream: fs.createReadStream(p), fileName: job.result.resultFileName || 'result.txt' };
  })();
}

export function getResultOutputText(jobId, { userId, isAdmin } = {}) {
  return (async () => {
    const job = await getJobById(jobId, { userId, isAdmin });
    if (!job || job.status !== 'completed') return null;
    const p = job.result?.resultFilePath;
    if (p && fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.size > MAX_OUTPUT_TEXT_BYTES) return { tooLarge: true, size: stat.size };
      return { text: fs.readFileSync(p, 'utf-8') };
    }
    if (job.type === 'wordcount' && job.result?.stats) {
      return { text: null, statsOnly: true };
    }
    return null;
  })();
}
