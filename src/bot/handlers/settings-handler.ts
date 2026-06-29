import { Telegraf } from 'telegraf';
import { BotContext } from '../middlewares';
import { prisma } from '../../database';

const CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Medan', 'Makassar', 'Semarang'];

export const registerSettingsHandler = (bot: Telegraf<BotContext>): void => {
  bot.action('settings:prayer', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    const current = settings?.prayerReminder ?? true;
    await prisma.userSettings.upsert({
      where: { userId },
      update: { prayerReminder: !current },
      create: { userId, prayerReminder: !current },
    });
    await ctx.reply(`🕌 Reminder Shalat: ${!current ? '✅ Aktif' : '❌ Nonaktif'}`);
  });

  bot.action('settings:task', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    const current = settings?.taskReminder ?? true;
    await prisma.userSettings.upsert({
      where: { userId },
      update: { taskReminder: !current },
      create: { userId, taskReminder: !current },
    });
    await ctx.reply(`📚 Reminder Tugas: ${!current ? '✅ Aktif' : '❌ Nonaktif'}`);
  });

  bot.action('settings:quote', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    const current = settings?.dailyQuote ?? true;
    await prisma.userSettings.upsert({
      where: { userId },
      update: { dailyQuote: !current },
      create: { userId, dailyQuote: !current },
    });
    await ctx.reply(`💬 Quote Harian: ${!current ? '✅ Aktif' : '❌ Nonaktif'}`);
  });

  bot.action('settings:city', async (ctx) => {
    await ctx.answerCbQuery();
    const buttons = CITIES.map((city) => [
      { text: city, callback_data: `settings:setcity:${city}` },
    ]);
    await ctx.reply('🏙️ Pilih kota untuk jadwal shalat:', {
      reply_markup: { inline_keyboard: buttons },
    });
  });

  bot.action(/^settings:setcity:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const city = ctx.match[1];
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    await prisma.userSettings.upsert({
      where: { userId },
      update: { city },
      create: { userId, city },
    });
    await ctx.reply(`✅ Kota jadwal shalat diatur ke: *${city}*`, { parse_mode: 'Markdown' });
  });

  // Profile setup
  bot.command('setprofil', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const args = ctx.message.text.replace('/setprofil ', '').split('|').map((s) => s.trim());
    if (args.length < 3) {
      return ctx.reply(
        'Format: /setprofil NIM | Program Studi | Semester | Angkatan\n' +
        'Contoh: /setprofil 2021234567 | Teknik Informatika | 5 | 2021'
      );
    }
    const [nim, program, semester, angkatan] = args;
    await prisma.academicProfile.upsert({
      where: { userId },
      update: { nim, program, semester: parseInt(semester) || 1, angkatan: parseInt(angkatan) || new Date().getFullYear() },
      create: { userId, nim, program, semester: parseInt(semester) || 1, angkatan: parseInt(angkatan) || new Date().getFullYear() },
    });
    await ctx.reply(
      `✅ *Profil Akademik Tersimpan!*\n\n📛 NIM: ${nim}\n🎓 Prodi: ${program}\n📅 Semester: ${semester}`,
      { parse_mode: 'Markdown' }
    );
  });
};
