import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.csv', '.tsv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .csv, .tsv, and .json files are allowed.'));
    }
  },
});

// In-memory store for jobs (replace with database in production)
let jobs = [];

// GET /api/jobs - Get all jobs
router.get('/', (req, res) => {
  try {
    const { status, type } = req.query;
    let filteredJobs = [...jobs];

    if (status) {
      filteredJobs = filteredJobs.filter(job => job.status === status);
    }
    if (type) {
      filteredJobs = filteredJobs.filter(job => job.type === type);
    }

    res.json(filteredJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id - Get a specific job
router.get('/:id', (req, res) => {
  try {
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs - Create a new job
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { jobType, options } = req.body;
    if (!jobType) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    const job = {
      id: String(Date.now()),
      type: jobType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
      status: 'pending',
      progress: 0,
      options: options ? JSON.parse(options) : {},
      result: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    jobs.push(job);
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /api/jobs/:id/cancel - Cancel a job
router.post('/:id/cancel', (req, res) => {
  try {
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot cancel job with status: ${job.status}` });
    }

    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    res.json({ message: 'Job cancelled successfully', id: req.params.id });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// DELETE /api/jobs/:id - Delete a job
router.delete('/:id', (req, res) => {
  try {
    const index = jobs.findIndex(j => j.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobs[index];
    // Delete the file if it exists
    if (job.filePath && fs.existsSync(job.filePath)) {
      fs.unlinkSync(job.filePath);
    }

    jobs.splice(index, 1);
    res.json({ message: 'Job deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// GET /api/jobs/:id/result - Get job result
router.get('/:id/result', (req, res) => {
  try {
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job is not completed yet' });
    }

    res.json({
      id: job.id,
      result: job.result,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error('Error fetching job result:', error);
    res.status(500).json({ error: 'Failed to fetch job result' });
  }
});

export default router;
