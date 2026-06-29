import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { dbLogger } from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

function ensureSqliteDirExists(): void {
  const url = process.env.DATABASE_URL || '';
  if (!url.startsWith('file:')) return;
  const filePath = url.replace('file:', '');
  const dir = path.dirname(path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const connectDatabase = async (): Promise<void> => {
  ensureSqliteDirExists();

  // Sync schema to database (creates tables if they don't exist yet).
  // db push is used instead of migrate deploy because it works reliably
  // for a single SQLite file without requiring migration history state.
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    dbLogger.info('Database schema synced');
  } catch (err: any) {
    dbLogger.warn('Schema sync skipped or already up to date', {
      message: err?.message?.slice(0, 300),
    });
  }

  try {
    await prisma.$connect();
    dbLogger.info('Database connected successfully');
  } catch (error) {
    dbLogger.error('Database connection failed', { error });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  dbLogger.info('Database disconnected');
};

export { prisma };
export default prisma;
