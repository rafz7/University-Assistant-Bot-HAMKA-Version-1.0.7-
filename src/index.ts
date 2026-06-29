import 'dotenv/config';
import { Telegraf } from 'telegraf';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase, prisma } from './database';
import { connectRedis } from './services/redis';

import { BotContext, userMiddleware, rateLimiterMiddleware, loggingMiddleware, errorMiddleware } from './bot/middlewares';
import { registerStartCommand } from './bot/commands/start';
import { registerAcademicCommands } from './bot/commands/academic';
import { registerAICommands } from './bot/commands/ai-assistant';
import { registerFileHandler } from './bot/handlers/file-handler';
import { registerSettingsHandler } from './bot/handlers/settings-handler';
import { registerTranscriptModule } from './modules/transcript';
import { registerDashboardModule } from './modules/dashboard';
import { registerKnowledgeModule } from './modules/knowledge';
import { registerIslamicModule } from './modules/islamic';
import { registerQuranModule } from './modules/quran';
import { registerHabitModule } from './modules/habit';
import { registerCareerModule } from './modules/career';
import { registerLanguageModule } from './modules/language';
import { registerResearchModule } from './modules/research';
import { registerNotesCommands } from './modules/academic/notes';
import { registerAdminPanel } from './admin';
import { startScheduler, setBot } from './scheduler';
import { startQueueWorkers } from './services/queue';

// Ensure directories exist
[config.logging.dir, './data', path.join(process.cwd(), 'logs'), path.join(process.cwd(), 'data')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    node: process.version,
    version: '1.0.0',
  });
});

app.get('/', (_req, res) => {
  res.json({ message: '🎓 UHAMKA Digital Campus Assistant is running!' });
});

async function bootstrap(): Promise<void> {
  try {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🎓 UHAMKA Digital Campus Assistant v1.0');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await connectDatabase();
    logger.info('✅ Database (SQLite) connected');

    try { await connectRedis(); } catch { logger.warn('⚠️ Redis tidak tersedia — pakai memory cache'); }

    const bot = new Telegraf<BotContext>(config.telegram.token, { handlerTimeout: 90_000 });

    bot.use(loggingMiddleware);
    bot.use(userMiddleware);
    bot.use(rateLimiterMiddleware);

    // Register all modules
    registerStartCommand(bot);
    registerAcademicCommands(bot);
    registerTranscriptModule(bot);
    registerDashboardModule(bot);
    registerKnowledgeModule(bot);
    registerIslamicModule(bot);
    registerQuranModule(bot);
    registerHabitModule(bot);
    registerCareerModule(bot);
    registerLanguageModule(bot);
    registerResearchModule(bot);
    registerNotesCommands(bot);
    registerFileHandler(bot);
    registerSettingsHandler(bot);
    registerAdminPanel(bot);
    registerAICommands(bot); // LAST — handles all text

    bot.hears('📄 Analisis File', async (ctx) => {
      await ctx.reply(`📄 *Analisis File*\n\nKirim file (PDF, DOCX, TXT, PPTX, CSV, XLSX).\nMaks ${config.upload.maxFileSizeMb}MB.\n\nFitur:\n• 📋 Ringkasan\n• ❓ Quiz\n• 🗺️ Mindmap\n• 🃏 Flashcard\n• 🔑 Keyword`, { parse_mode: 'Markdown' });
    });

    bot.hears('🎓 Akademik', async (ctx) => {
      const { Markup } = await import('telegraf');
      await ctx.reply('🎓 *Menu Akademik*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 Tugas', 'task:list'), Markup.button.callback('📅 Jadwal', 'jadwal:today')],
          [Markup.button.callback('📓 Catatan', 'notes:list')],
          [Markup.button.callback('➕ Tambah Tugas', 'task:add')],
        ]),
      });
    });

    bot.action('jadwal:today', async (ctx) => {
      await ctx.answerCbQuery();
      const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
      const today = days[new Date().getDay()];
      const userId = ctx.dbUser?.id;
      if (!userId) return;
      const schedules = await prisma.schedule.findMany({ where: { userId, day: today, isActive: true }, orderBy: { startTime: 'asc' } });
      if (!schedules.length) {
        return ctx.reply(
          '📅 Tidak ada kuliah hari ini! 🎉\n\n_Cek kalender akademik di menu 🏫 UHAMKA untuk tahu masa KRS/perkuliahan saat ini._',
          { parse_mode: 'Markdown' }
        );
      }
      let text = `📅 *Jadwal Hari Ini*\n\n`;
      schedules.forEach(s => { text += `🕐 ${s.startTime}–${s.endTime} | *${s.subject}*\n${s.room ? `📍 ${s.room}\n` : ''}`; });
      await ctx.reply(text, { parse_mode: 'Markdown' });
    });

    bot.catch(errorMiddleware);

    // Launch mode
    let mode = config.telegram.mode;
    if (mode === 'auto') mode = config.telegram.webhookUrl ? 'webhook' : 'polling';

    if (mode === 'webhook' && config.telegram.webhookUrl) {
      const wPath = `/webhook/${config.telegram.token.slice(-10)}`;
      await bot.telegram.setWebhook(`${config.telegram.webhookUrl}${wPath}`);
      app.use(bot.webhookCallback(wPath));
      logger.info(`✅ Webhook mode aktif`);
    } else {
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      bot.launch().catch((err: any) => {
        logger.error('Polling error', { message: err?.message });
      });
      logger.info('✅ Polling mode aktif');
    }

    setBot(bot);
    startScheduler();
    startQueueWorkers(bot);

    const server = app.listen(config.port, () => {
      logger.info(`✅ HTTP server: http://localhost:${config.port}`);
      logger.info('✅ Bot siap digunakan! Bismillah 🎓');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    const shutdown = async (signal: string) => {
      logger.info(`Shutdown: ${signal}`);
      bot.stop(signal);
      server.close();
      await disconnectDatabase();
      process.exit(0);
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (err) => logger.error('Uncaught exception', { err: err.message }));
    process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));

  } catch (error: any) {
    logger.error('Fatal error', { error: error.message });
    process.exit(1);
  }
}

bootstrap();
