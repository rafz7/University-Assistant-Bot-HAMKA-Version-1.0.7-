import { Context, Middleware } from 'telegraf';
import { prisma } from '../../database';
import { cache } from '../../services/redis';
import { config } from '../../config';
import { botLogger, securityLogger } from '../../utils/logger';

export interface BotContext extends Context {
  dbUser?: any;
  isOwner: boolean;
  isAdmin: boolean;
  startTime: number;
}

async function getOrCreateUser(ctx: Context) {
  const tgUser = ctx.from!;
  const telegramId = String(tgUser.id);

  let user = await prisma.user.findUnique({
    where: { telegramId },
    include: { profile: true, settings: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: tgUser.username || null,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name || null,
        languageCode: tgUser.language_code || 'id',
        settings: {
          create: { language: 'id', timezone: 'Asia/Jakarta' },
        },
      },
      include: { profile: true, settings: true },
    });
    botLogger.info('New user', { telegramId, username: tgUser.username });
  }
  return user;
}

export const userMiddleware: Middleware<BotContext> = async (ctx, next) => {
  ctx.startTime = Date.now();
  if (!ctx.from) return next();
  try {
    ctx.dbUser = await getOrCreateUser(ctx);
    ctx.isOwner = String(ctx.from.id) === String(config.telegram.ownerTelegramId);
    ctx.isAdmin = ctx.isOwner || ctx.dbUser?.role === 'ADMIN';
    if (ctx.dbUser?.isBlocked && !ctx.isOwner) {
      await ctx.reply('❌ Akun Anda diblokir. Hubungi admin.');
      return;
    }
  } catch (error) {
    botLogger.error('User middleware error', { error });
  }
  return next();
};

export const rateLimiterMiddleware: Middleware<BotContext> = async (ctx, next) => {
  if (!ctx.from || ctx.isOwner) return next();
  const key = `rate:${ctx.from.id}`;
  const count = await cache.incr(key, Math.floor(config.rateLimit.windowMs / 1000));
  if (count > config.rateLimit.maxRequests) {
    await ctx.reply('⏳ Terlalu banyak permintaan. Tunggu sebentar.');
    return;
  }
  return next();
};

export const loggingMiddleware: Middleware<BotContext> = async (ctx, next) => {
  await next();
  const elapsed = Date.now() - (ctx.startTime || Date.now());
  botLogger.debug('Request', { userId: ctx.from?.id, type: ctx.updateType, elapsed });
};

export const errorMiddleware = (err: Error, ctx: BotContext) => {
  botLogger.error('Bot error', { error: err.message, userId: ctx.from?.id });
};
