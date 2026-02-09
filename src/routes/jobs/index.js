import express from 'express';
import { upload } from '../../middleware/upload.js';
import * as jobsService from '../../services/jobsService.js';

const router = express.Router();

// GET /api/jobs
router.get('/', (req, res) => {
  try {
    const { status, type } = req.query;
    const jobs = jobsService.listJobs({ status, type });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id/result (must be before GET /:id)
router.get('/:id/result', (req, res) => {
  try {
    const result = jobsService.getJobResult(req.params.id);
    if (!result) {
      const job = jobsService.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      return res.status(400).json({ error: 'Job is not completed yet' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching job result:', error);
    res.status(500).json({ error: 'Failed to fetch job result' });
  }
});

// GET /api/jobs/:id
router.get('/:id', (req, res) => {
  try {
    const job = jobsService.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { jobType, options } = req.body;
    if (!jobType) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    const file = req.file;
    console.log(`[Jobs] Received file: "${file.originalname}", size: ${file.size} bytes, jobType: ${jobType}`);

    const optionsParsed = options ? JSON.parse(options || '{}') : {};
    const job = jobsService.createJob({
      filePath: file.path,
      originalname: file.originalname,
      size: file.size,
      jobType,
      options: optionsParsed,
    });

    // Process file and complete the job (sync for word-count / text-stats style jobs)
    try {
      const { stats } = jobsService.processFileWithAlgorithms(job.filePath, job.type);
      jobsService.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: { stats },
        completedAt: new Date().toISOString(),
      });
      console.log(`[Jobs] Job ${job.id} completed successfully (file: ${file.originalname})`);
    } catch (processErr) {
      jobsService.updateJob(job.id, {
        status: 'failed',
        errorMessage: processErr.message,
        updatedAt: new Date().toISOString(),
      });
      console.error(`[Jobs] Job ${job.id} failed:`, processErr.message);
    }

    const updatedJob = jobsService.getJobById(job.id);
    res.status(201).json(updatedJob);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /api/jobs/:id/cancel
router.post('/:id/cancel', (req, res) => {
  try {
    const job = jobsService.cancelJob(req.params.id);
    if (!job) {
      const existing = jobsService.getJobById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Job not found' });
      }
      return res
        .status(400)
        .json({ error: `Cannot cancel job with status: ${existing.status}` });
    }
    res.json({ message: 'Job cancelled successfully', id: req.params.id });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', (req, res) => {
  try {
    const deleted = jobsService.deleteJob(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
