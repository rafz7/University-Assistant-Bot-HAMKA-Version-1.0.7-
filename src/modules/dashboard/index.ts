import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { prisma } from '../../database';
import { cache } from '../../services/redis';
import axios from 'axios';
import { config } from '../../config';

const ISLAMIC_QUOTES = [
  'إِنَّ مَعَ الْعُسْرِ يُسْرًا — Sesungguhnya bersama kesulitan ada kemudahan. (QS. 94:6)',
  'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ — Barangsiapa bertawakal kepada Allah, maka Dia cukup baginya. (QS. 65:3)',
  'فَاذْكُرُونِي أَذْكُرْكُمْ — Ingatlah Aku, niscaya Aku ingat kamu. (QS. 2:152)',
  'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ — Sesungguhnya Allah bersama orang-orang yang sabar. (QS. 2:153)',
  'وَقُل رَّبِّ زِدْنِي عِلْمًا — Ya Tuhanku, tambahkanlah ilmu kepadaku. (QS. 20:114)',
];

export const registerDashboardModule = (bot: Telegraf<BotContext>): void => {
  bot.command('dashboard', async (ctx) => {
    await showDashboard(ctx);
  });

  bot.hears('📊 Dashboard', async (ctx) => {
    await showDashboard(ctx);
  });

  async function showDashboard(ctx: BotContext) {
    const userId = ctx.dbUser?.id;
    if (!userId) return ctx.reply('Silakan /start terlebih dahulu.');

    const [profile, tasks, transcripts, habitToday] = await Promise.all([
      prisma.academicProfile.findUnique({ where: { userId } }),
      prisma.task.findMany({
        where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { dueDate: 'asc' },
        take: 3,
      }),
      prisma.transcript.findMany({ where: { userId } }),
      prisma.habitLog.findFirst({
        where: { userId, date: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    // Calculate IPK
    const totalCredits = transcripts.reduce((sum, t) => sum + t.credits, 0);
    const totalPoints = transcripts.reduce((sum, t) => sum + t.gradePoint * t.credits, 0);
    const ipk = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '-';

    // Habit score
    const habitFields = ['shalat', 'tilawah', 'dzikir', 'tahajud', 'puasa', 'belajar', 'olahraga'];
    const habitScore = habitToday
      ? habitFields.filter((f) => (habitToday as any)[f]).length
      : 0;

    // Prayer times
    const city = ctx.dbUser?.settings?.city || config.prayer.defaultCity;
    const cacheKey = `prayer:${city}:${new Date().toDateString()}`;
    let prayerTimes = await cache.get<Record<string, string>>(cacheKey);
    if (!prayerTimes) {
      try {
        const res = await axios.get(
          `${config.prayer.apiUrl}/timingsByCity?city=${city}&country=${config.prayer.defaultCountry}&method=11`
        );
        prayerTimes = res.data?.data?.timings;
        if (prayerTimes) await cache.set(cacheKey, prayerTimes, 3600);
      } catch {}
    }

    const quote = ISLAMIC_QUOTES[Math.floor(Math.random() * ISLAMIC_QUOTES.length)];
    const name = ctx.dbUser?.firstName || 'Mahasiswa';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let dash = `🌟 *Dashboard UHAMKA*\n`;
    dash += `👤 ${name}`;
    if (profile?.program) dash += ` | ${profile.program}`;
    if (profile?.semester) dash += ` | Sem. ${profile.semester}`;
    dash += `\n🕐 ${timeStr} | ${dateStr}\n\n`;

    if (prayerTimes) {
      dash += `🕌 *Shalat Hari Ini*\n`;
      dash += `Subuh ${prayerTimes.Fajr} • Dzuhur ${prayerTimes.Dhuhr} • Ashar ${prayerTimes.Asr} • Maghrib ${prayerTimes.Maghrib} • Isya ${prayerTimes.Isha}\n\n`;
    }

    dash += `🎓 *Akademik*\n`;
    dash += `IPK: *${ipk}* | Tugas Aktif: *${tasks.length}*\n`;
    if (tasks.length > 0) {
      const next = tasks[0];
      const due = next.dueDate ? new Date(next.dueDate).toLocaleDateString('id-ID') : 'Tidak ada deadline';
      dash += `⏰ Deadline Terdekat: *${next.title}* (${due})\n`;
    }
    dash += `\n📈 *Habit Hari Ini:* ${habitScore}/7 `;
    dash += `${'⭐'.repeat(habitScore)}${'☆'.repeat(7 - habitScore)}\n\n`;
    dash += `💬 _${quote}_`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🎓 Tugas', 'task:list'), Markup.button.callback('📊 IPK', 'transcript:gpa')],
      [Markup.button.callback('📈 Habit', 'habit:today'), Markup.button.callback('🕌 Shalat', 'shalat:today')],
      [Markup.button.callback('🔄 Refresh', 'dashboard:refresh')],
    ]);

    await ctx.reply(dash, { parse_mode: 'Markdown', ...keyboard });
  }

  bot.action('dashboard:refresh', async (ctx) => {
    await ctx.answerCbQuery('🔄 Memperbarui...');
    await showDashboard(ctx as any);
  });
};
