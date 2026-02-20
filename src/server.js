import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import jobsRouter from './routes/jobs/index.js';
import authRouter from './routes/auth/index.js';
import { getPool, testConnection } from './db/connection.js';
import { initSchema } from './db/schema.js';
import { ensureAdminFromEnv } from './db/seedAdmin.js';
import logger from './logger.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);

io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, 'Client connected');
  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  logger.info({ port: PORT }, 'Server running');
  const dbOk = await testConnection();
  if (dbOk) {
    await initSchema();
    await ensureAdminFromEnv();
    logger.info('Database ready');
  } else {
    logger.warn('Database not configured or unavailable');
  }
});
