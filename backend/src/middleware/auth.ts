import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireProjectAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const rawId = req.params['projectId'] ?? req.params['id'];
  const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user!.id } },
  });
  if (!member || member.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
