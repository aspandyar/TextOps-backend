import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loadUsers, saveUsers } from '../../store/usersStore.js';
import { requireAuth, JWT_SECRET } from '../../middleware/auth.js';

const router = express.Router();
let users = loadUsers();

function reloadUsers() {
  users = loadUsers();
}

router.post('/register', (req, res) => {
  try {
    reloadUsers();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (users.some((u) => u.email === normalizedEmail)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const id = String(Date.now());
    const passwordHash = bcrypt.hashSync(password, 10);
    const role = users.length === 0 ? 'admin' : 'user';
    const user = {
      id,
      email: normalizedEmail,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', (req, res) => {
  try {
    reloadUsers();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
