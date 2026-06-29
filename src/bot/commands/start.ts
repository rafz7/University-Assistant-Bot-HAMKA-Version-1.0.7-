import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../middlewares';
import { config } from '../../config';
import path from 'path';
import fs from 'fs';

const LOGO_PATH = path.join(__dirname, '../../assets/logo.png');

export const registerStartCommand = (bot: Telegraf<BotContext>): void => {
  bot.start(async (ctx) => {
    const user = ctx.dbUser;
    const name = user?.firstName || ctx.from?.first_name || 'Mahasiswa';

    const welcomeText = `
السلام عليكم ورحمة الله وبركاته

Selamat datang di *UHAMKA Digital Campus Assistant*, ${name}! 🎓

Saya adalah asisten digital kampus UHAMKA yang siap membantu:

📚 *Akademik* — Tugas, jadwal, transkrip, target semester
🏫 *Info UHAMKA* — Fakultas, dosen, beasiswa, pengumuman
📖 *Repository* — Skripsi, jurnal, penelitian
🤖 *AI Assistant* — Tutor, penulis, asisten riset
📖 *Al-Qur'an* — Baca, cari ayat, tafsir, tilawah
🕌 *Islami* — Jadwal shalat, dzikir, doa, kajian
📈 *Habit Tracker* — Gamifikasi ibadah & kebiasaan baik
💼 *Karir* — CV Builder, beasiswa, magang
🌍 *Bahasa* — Inggris, Arab, Jerman

*Prioritas jawaban saya:*
1️⃣ Knowledge Base UHAMKA
2️⃣ Data pribadi Anda
3️⃣ Repository akademik
4️⃣ Sumber terpercaya
5️⃣ Pengetahuan umum AI

Pilih menu di bawah untuk memulai:
    `;

    const keyboard = Markup.keyboard([
      ['🏫 UHAMKA', '🎓 Akademik'],
      ['📊 Transkrip', '📖 Repository'],
      ['🤖 AI Assistant', '📄 Analisis File'],
      ['📖 Al-Qur\'an', '🕌 Islami'],
      ['📈 Habit Tracker', '💼 Karir'],
      ['🌍 Bahasa', '📊 Dashboard'],
      ['⚙️ Pengaturan', '📞 Support'],
    ]).resize();

    try {
      if (fs.existsSync(LOGO_PATH)) {
        await ctx.replyWithPhoto(
          { source: LOGO_PATH },
          { caption: welcomeText, parse_mode: 'Markdown', reply_markup: keyboard.reply_markup }
        );
      } else {
        await ctx.reply(welcomeText, { parse_mode: 'Markdown', ...keyboard });
      }
    } catch {
      await ctx.reply(welcomeText, { parse_mode: 'Markdown', ...keyboard });
    }
  });

  // Help command
  bot.help(async (ctx) => {
    await ctx.reply(
      `🆘 *Bantuan UHAMKA Bot*\n\n` +
      `Gunakan menu keyboard atau ketik langsung pertanyaan Anda.\n\n` +
      `*Perintah tersedia:*\n` +
      `/start - Menu utama\n` +
      `/help - Bantuan\n` +
      `/dashboard - Dashboard saya\n` +
      `/tugas - Manajemen tugas\n` +
      `/jadwal - Jadwal kuliah\n` +
      `/transkrip - Data transkrip\n` +
      `/quran - Al-Qur'an Center\n` +
      `/shalat - Jadwal shalat\n` +
      `/habit - Habit tracker\n` +
      `/karir - Career center\n` +
      `/ai - AI Assistant\n` +
      `/uhamka - Info UHAMKA\n` +
      `/settings - Pengaturan\n\n` +
      `📞 *Support:* @${config.telegram.ownerUsername}`,
      { parse_mode: 'Markdown' }
    );
  });
};
