import cron from 'node-cron';
import { prisma } from '../database';
import { schedulerLogger } from '../utils/logger';
import { cache } from '../services/redis';
import axios from 'axios';
import { config } from '../config';

let botInstance: any = null;

export const setBot = (bot: any) => { botInstance = bot; };

export const startScheduler = (): void => {
  schedulerLogger.info('Starting scheduler...');

  // Daily morning greeting (7:00 AM WIB)
  cron.schedule('0 7 * * *', async () => {
    schedulerLogger.info('Running daily morning greeting');
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true, isBlocked: false },
        include: { settings: true },
        take: 100, // Batch processing
      });

      for (const user of users) {
        if (!user.settings?.dailyQuote) continue;
        try {
          const messages = [
            '🌅 بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\n\nSelamat pagi! Semangat belajar hari ini! 💪\n\n/dashboard untuk melihat tugas hari ini.',
            '☀️ Assalamu\'alaikum!\n\nPagi yang berkah, semoga harimu produktif! 📚\n\nJangan lupa:\n✅ Shalat Subuh\n✅ Tilawah pagi\n✅ Cek jadwal kuliah /jadwal',
          ];
          const msg = messages[Math.floor(Math.random() * messages.length)];
          if (botInstance) {
            await botInstance.telegram.sendMessage(user.telegramId.toString(), msg);
          }
          await new Promise((r) => setTimeout(r, 150)); // Rate limit
        } catch {}
      }
    } catch (error) {
      schedulerLogger.error('Morning greeting error', { error });
    }
  }, { timezone: 'Asia/Jakarta' });

  // Task reminder check (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      const upcoming = await prisma.task.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
          },
          reminderAt: { lte: new Date() },
        },
        include: { user: true },
        take: 50,
      });

      for (const task of upcoming) {
        try {
          if (botInstance) {
            const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString('id-ID') : 'Tidak ada deadline';
            await botInstance.telegram.sendMessage(
              task.user.telegramId.toString(),
              `⏰ *Reminder Tugas!*\n\n📚 *${task.title}*\n📅 Deadline: ${due}\n\nSegera selesaikan tugasmu! 💪`,
              { parse_mode: 'Markdown' }
            );
            // Update to not resend
            await prisma.task.update({
              where: { id: task.id },
              data: { reminderAt: null },
            });
          }
          await new Promise((r) => setTimeout(r, 100));
        } catch {}
      }
    } catch (error) {
      schedulerLogger.error('Task reminder error', { error });
    }
  }, { timezone: 'Asia/Jakarta' });

  // Prayer time reminders (Maghrib - 6 PM)
  cron.schedule('0 18 * * *', async () => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true, isBlocked: false },
        include: { settings: true },
        take: 100,
      });

      for (const user of users) {
        if (!user.settings?.prayerReminder) continue;
        try {
          if (botInstance) {
            await botInstance.telegram.sendMessage(
              user.telegramId.toString(),
              '🕌 *Waktunya Shalat Maghrib!*\n\nAstaghfirullah, jangan sampai terlewat. 🙏\n\nTinggalkan sejenak aktivitasmu dan segera tunaikan shalat.',
              { parse_mode: 'Markdown' }
            );
          }
          await new Promise((r) => setTimeout(r, 150));
        } catch {}
      }
    } catch (error) {
      schedulerLogger.error('Prayer reminder error', { error });
    }
  }, { timezone: 'Asia/Jakarta' });

  // Overdue task checker (midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      await prisma.task.updateMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
        },
        data: { status: 'OVERDUE' },
      });
      schedulerLogger.info('Overdue tasks updated');
    } catch (error) {
      schedulerLogger.error('Overdue check error', { error });
    }
  }, { timezone: 'Asia/Jakarta' });

  // Cache cleanup (every 6 hours)
  cron.schedule('0 */6 * * *', async () => {
    schedulerLogger.info('Cache cleanup running');
  });

  schedulerLogger.info('All schedulers started');
};
