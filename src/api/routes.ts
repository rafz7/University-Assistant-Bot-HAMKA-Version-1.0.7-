import { Router, Request, Response } from 'express';
import { prisma } from '../database';
import { knowledgeSyncService } from '../services/knowledge-sync';
import { aiRouter } from '../services/providers/ai-router';
import { authMiddleware } from '../services/auth';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    },
    node: process.version,
    version: '1.0.0',
  });
});

router.get('/stats', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const [users, knowledge] = await Promise.all([
      prisma.user.count(),
      knowledgeSyncService.getStats(),
    ]);
    res.json({
      users,
      knowledge,
      ai: { providers: aiRouter.getStats(), healthy: aiRouter.getHealthyCount() },
    });
  } catch {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/sync', authMiddleware, async (_req: Request, res: Response) => {
  knowledgeSyncService.syncAll().catch(console.error);
  res.json({ message: 'Knowledge sync triggered' });
});

router.get('/users', authMiddleware, async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) || '1');
  const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip, take: limit,
      select: { id: true, telegramId: true, username: true, firstName: true, role: true, createdAt: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);
  res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

export default router;
