import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Request, Response, NextFunction } from 'express';

export interface JWTPayload {
  telegramId: string;
  role: 'ADMIN' | 'OWNER';
  iat?: number;
  exp?: number;
}

export const signToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });

export const verifyToken = (token: string): JWTPayload =>
  jwt.verify(token, config.jwt.secret) as JWTPayload;

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const token = auth.slice(7);
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
