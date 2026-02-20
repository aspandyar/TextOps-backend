import express from 'express';
import { upload } from '../../middleware/upload.js';
import { requireAuth } from '../../middleware/auth.js';
import * as jobsService from '../../services/jobsService.js';
import logger from '../../logger.js';

const router = express.Router();
const access = (req) => ({ userId: req.user?.id, isAdmin: req.user?.role === 'admin' });

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    const jobs = await jobsService.listJobs({
      userId: req.user.id,
      isAdmin: req.user.role === 'admin',
      status,
      type,
    });
    res.json(jobs);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching jobs');
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/:id/result', async (req, res) => {
  try {
    const result = await jobsService.getJobResult(req.params.id, access(req));
    if (!result) {
      const job = await jobsService.getJobById(req.params.id, access(req));
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      return res.status(400).json({ error: 'Job is not completed yet' });
    }
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching job result');
    res.status(500).json({ error: 'Failed to fetch job result' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await jobsService.getJobById(req.params.id, access(req));
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching job');
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { jobType, options } = req.body;
    if (!jobType) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    const file = req.file;
    logger.info(
      { file: file.originalname, size: file.size, jobType, userId: req.user.id },
      'Job file received'
    );

    const optionsParsed = options ? JSON.parse(options || '{}') : {};
    const job = await jobsService.createJob({
      userId: req.user.id,
      filePath: file.path,
      originalname: file.originalname,
      size: file.size,
      jobType,
      options: optionsParsed,
    });

    try {
      const { stats } = jobsService.processFileWithAlgorithms(job.filePath, job.type);
      await jobsService.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: { stats },
        completedAt: new Date().toISOString(),
      });
      logger.info({ jobId: job.id, file: file.originalname }, 'Job completed');
    } catch (processErr) {
      await jobsService.updateJob(job.id, {
        status: 'failed',
        errorMessage: processErr.message,
      });
      logger.error({ err: processErr, jobId: job.id }, 'Job failed');
    }

    const updatedJob = await jobsService.getJobById(job.id);
    res.status(201).json(updatedJob);
  } catch (error) {
    logger.error({ err: error }, 'Error creating job');
    res.status(500).json({ error: 'Failed to create job' });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const job = await jobsService.cancelJob(req.params.id, access(req));
    if (!job) {
      const existing = await jobsService.getJobById(req.params.id, access(req));
      if (!existing) {
        return res.status(404).json({ error: 'Job not found' });
      }
      return res
        .status(400)
        .json({ error: `Cannot cancel job with status: ${existing.status}` });
    }
    res.json({ message: 'Job cancelled successfully', id: req.params.id });
  } catch (error) {
    logger.error({ err: error }, 'Error cancelling job');
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await jobsService.deleteJob(req.params.id, {
      ...access(req),
      removeFile: true,
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully', id: req.params.id });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting job');
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
