import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findByEmail, create as createUser, count as userCount } from '../../db/usersRepository.js';
import { requireAuth, JWT_SECRET } from '../../middleware/auth.js';
import logger from '../../logger.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await findByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const count = await userCount();
    const role = count === 0 ? 'admin' : 'user';
    const id = String(Date.now());
    const passwordHash = bcrypt.hashSync(password, 10);
    await createUser({
      id,
      email: normalizedEmail,
      passwordHash,
      role,
    });
    const user = { id, email: normalizedEmail, role };
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    logger.info({ userId: id, email: normalizedEmail, role }, 'User registered');
    res.status(201).json({ token, user });
  } catch (error) {
    logger.error({ err: error }, 'Registration error');
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await findByEmail(normalizedEmail);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
