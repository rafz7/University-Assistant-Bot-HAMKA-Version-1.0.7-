import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config';

const logDir = config.logging.dir;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: config.env === 'production' ? 'warn' : 'debug',
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '30d',
    maxSize: '20m',
    format: logFormat,
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: logFormat,
  }),
];

export const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
});

// Module-specific loggers
export const createLogger = (module: string) => logger.child({ module });

export const botLogger = createLogger('telegram-bot');
export const aiLogger = createLogger('ai-router');
export const dbLogger = createLogger('database');
export const knowledgeLogger = createLogger('knowledge');
export const securityLogger = createLogger('security');
export const schedulerLogger = createLogger('scheduler');
