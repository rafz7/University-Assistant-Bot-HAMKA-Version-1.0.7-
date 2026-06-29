import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../bot/middlewares';
import { prisma } from '../database';
import { aiRouter } from '../services/providers/ai-router';
import { config } from '../config';

export const registerAdminPanel = (bot: Telegraf<BotContext>): void => {
  const ownerOnly = async (ctx: BotContext, next: () => Promise<void>) => {
    if (!ctx.isOwner) { await ctx.reply('⛔ Akses ditolak.'); return; }
    return next();
  };

  bot.command('admin', ownerOnly, async (ctx) => {
    const [userCount, docCount] = await Promise.all([
      prisma.user.count(),
      prisma.knowledgeDocument.count({ where: { isActive: true } }),
    ]);
    const aiStats = aiRouter.getStats();
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Broadcast', 'admin:broadcast')],
      [Markup.button.callback('👥 User Stats', 'admin:users'), Markup.button.callback('🤖 AI Stats', 'admin:ai')],
      [Markup.button.callback('📊 System', 'admin:system')],
    ]);
    await ctx.reply(
      `⚙️ *Admin Panel UHAMKA Bot*\n\n👥 Users: *${userCount}*\n📚 Docs: *${docCount}*\n🤖 AI: *${aiRouter.getHealthyCount()}/${aiStats.length}* healthy\n⏱ Uptime: ${Math.floor(process.uptime() / 60)}m`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  });

  bot.action('admin:users', ownerOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const [total, blocked] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBlocked: true } }),
    ]);
    await ctx.reply(`👥 *User Stats*\n\nTotal: *${total}*\nDiblokir: *${blocked}*\nAktif: *${total - blocked}*`, { parse_mode: 'Markdown' });
  });

  bot.action('admin:ai', ownerOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const stats = aiRouter.getStats();
    if (stats.length === 0) return ctx.reply('⚠️ Tidak ada AI provider dikonfigurasi.\nTambahkan GEMINI_API_KEY atau GROQ_API_KEY di .env');
    let text = '🤖 *AI Provider Stats*\n\n';
    stats.forEach(s => {
      text += `*${s.name}*: ${s.isHealthy ? '✅' : '❌'} | Req: ${s.requests} | Fail: ${s.failures}\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('admin:system', ownerOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const mem = process.memoryUsage();
    await ctx.reply(
      `📊 *System*\n\n⏱ Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n💾 RAM: ${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB\n📦 Node: ${process.version}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('admin:broadcast', ownerOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📢 Ketik: `/broadcast [pesan]`', { parse_mode: 'Markdown' });
  });

  bot.command('broadcast', ownerOnly, async (ctx) => {
    const message = ctx.message.text.replace('/broadcast ', '').trim();
    if (!message) return ctx.reply('Format: /broadcast [pesan]');
    const users = await prisma.user.findMany({ where: { isActive: true, isBlocked: false }, select: { telegramId: true } });
    let sent = 0, failed = 0;
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
        sent++;
        await new Promise(r => setTimeout(r, 100));
      } catch { failed++; }
    }
    await ctx.reply(`📢 Broadcast selesai!\n✅ Terkirim: ${sent}\n❌ Gagal: ${failed}`);
  });

  bot.command('blockuser', ownerOnly, async (ctx) => {
    const id = ctx.message.text.split(' ')[1];
    if (!id) return ctx.reply('Format: /blockuser [telegram_id]');
    await prisma.user.updateMany({ where: { telegramId: id }, data: { isBlocked: true } });
    await ctx.reply(`✅ User ${id} diblokir.`);
  });

  bot.command('unblockuser', ownerOnly, async (ctx) => {
    const id = ctx.message.text.split(' ')[1];
    if (!id) return ctx.reply('Format: /unblockuser [telegram_id]');
    await prisma.user.updateMany({ where: { telegramId: id }, data: { isBlocked: false } });
    await ctx.reply(`✅ User ${id} di-unblokir.`);
  });

  bot.hears('📞 Support', async (ctx) => {
    await ctx.reply(
      `📞 *Support UHAMKA Bot*\n\n👤 Owner: @${config.telegram.ownerUsername}\n\nLaporkan bug atau saran langsung ke owner.\n🌐 uhamka.ac.id`,
      { parse_mode: 'Markdown' }
    );
  });
};
