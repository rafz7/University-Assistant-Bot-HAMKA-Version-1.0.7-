import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { prisma } from '../../database';

const HABIT_ITEMS = [
  { key: 'shalat', label: '🕌 Shalat 5 Waktu', xp: 50 },
  { key: 'tilawah', label: "📖 Tilawah Al-Qur'an", xp: 30 },
  { key: 'dzikir', label: '📿 Dzikir Pagi/Petang', xp: 20 },
  { key: 'tahajud', label: '🌙 Tahajud', xp: 40 },
  { key: 'puasa', label: '🌙 Puasa Sunnah', xp: 60 },
  { key: 'belajar', label: '📚 Belajar Min. 2 Jam', xp: 25 },
  { key: 'olahraga', label: '🏃 Olahraga', xp: 20 },
];

export const registerHabitModule = (bot: Telegraf<BotContext>): void => {
  bot.command('habit', async (ctx) => { await showHabitTracker(ctx); });
  bot.hears('📈 Habit Tracker', async (ctx) => { await showHabitTracker(ctx); });
  bot.action('habit:today', async (ctx) => { await ctx.answerCbQuery(); await showHabitTracker(ctx); });

  async function showHabitTracker(ctx: BotContext) {
    const userId = ctx.dbUser?.id;
    if (!userId) return ctx.reply('Silakan /start terlebih dahulu.');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayLog = await prisma.habitLog.findFirst({ where: { userId, date: today } });
    if (!todayLog) todayLog = await prisma.habitLog.create({ data: { userId, date: today } });

    const habitStatus = todayLog as any;
    const buttons = HABIT_ITEMS.map((h) => [
      Markup.button.callback(`${habitStatus[h.key] ? '✅' : '⬜'} ${h.label} (+${h.xp}XP)`, `habit:toggle:${h.key}`),
    ]);
    buttons.push([Markup.button.callback('📊 Progress Minggu Ini', 'habit:weekly')]);

    const totalXp = HABIT_ITEMS.reduce((sum, h) => sum + (habitStatus[h.key] ? h.xp : 0), 0);
    const maxXp = HABIT_ITEMS.reduce((sum, h) => sum + h.xp, 0);
    const filledBars = Math.floor((totalXp / maxXp) * 10);

    await ctx.reply(
      `📈 *Habit Tracker - ${new Date().toLocaleDateString('id-ID')}*\n\n` +
      `⚡ XP Hari Ini: *${totalXp}/${maxXp}*\n` +
      `${'█'.repeat(filledBars)}${'░'.repeat(10 - filledBars)}\n\nTap untuk menandai:`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
  }

  bot.action('habit:weekly', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await prisma.habitLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
    });

    const totalXpWeek = logs.reduce((sum, l) => sum + l.xpEarned, 0);
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    let text = '📊 *Progress Minggu Ini*\n\n';
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const log = logs.find((l) => new Date(l.date).getTime() === d.getTime());
      const completedCount = log
        ? HABIT_ITEMS.filter((h) => (log as any)[h.key]).length
        : 0;
      const stars = '⭐'.repeat(completedCount) + '☆'.repeat(HABIT_ITEMS.length - completedCount);
      text += `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1}): ${stars} ${log ? `+${log.xpEarned}XP` : ''}\n`;
    }

    text += `\n⚡ *Total XP Minggu Ini: ${totalXpWeek}*\n`;

    // Per-habit completion rate this week
    text += `\n📋 *Konsistensi per Kebiasaan:*\n`;
    HABIT_ITEMS.forEach((h) => {
      const count = logs.filter((l) => (l as any)[h.key]).length;
      text += `${h.label}: ${count}/7 hari\n`;
    });

    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  HABIT_ITEMS.forEach(({ key, xp }) => {
    bot.action(`habit:toggle:${key}`, async (ctx) => {
      await ctx.answerCbQuery();
      const userId = ctx.dbUser?.id;
      if (!userId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const log = await prisma.habitLog.findFirst({ where: { userId, date: today } });
      if (!log) return;

      const current = (log as any)[key];
      const newXp = log.xpEarned + (current ? -xp : xp);

      await prisma.habitLog.update({
        where: { id: log.id },
        data: { [key]: !current, xpEarned: Math.max(0, newXp) },
      });

      await showHabitTracker(ctx);
    });
  });
};
