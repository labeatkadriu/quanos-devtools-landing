import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(200),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions,
    );
    return res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAdmin, (req: Request, res: Response) => {
  res.json({ username: req.user?.username, role: req.user?.role });
});

export default router;
