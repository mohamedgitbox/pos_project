import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { authMiddleware } from '../middleware/auth';
import { JWT_SECRET } from '../config/jwt';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role, branchId: user.branchId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // إعدادات الـ Cookie لتعمل بشكل صحيح على localhost
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // مهم جداً: يجب أن يكون false على localhost (http)
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
        },
      },
    });
  } catch {
    return res.status(400).json({ success: false, error: 'Validation failed' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ success: true });
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  return res.json({ success: true, data: req.user });
});

export default router;
