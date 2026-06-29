import { createLogger } from '../utils/logger';
const logger = createLogger('queue');

// Graceful stub if Redis unavailable
export const scheduleNotification = async (job: any, delayMs = 0): Promise<void> => {
  logger.debug('Notification queued (in-memory)', { job });
};

export const scheduleBroadcast = async (job: any): Promise<void> => {
  logger.debug('Broadcast queued (in-memory)', { job });
};

export const startQueueWorkers = (botInstance: any): void => {
  logger.info('Queue workers using in-memory mode (Redis optional)');
};
