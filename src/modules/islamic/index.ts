import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import axios from 'axios';
import { config } from '../../config';
import { cache } from '../../services/redis';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function calculateQiblaBearing(lat: number, lng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(lat);
  const lat2 = toRad(KAABA_LAT);
  const dLng = toRad(KAABA_LNG - lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing);
}

function bearingToCompass(bearing: number): string {
  const directions = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
  return directions[Math.round(bearing / 45) % 8];
}

const DOA_HARIAN = [
  { judul: 'Doa Bangun Tidur', arab: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', arti: 'Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami kembali.' },
  { judul: 'Doa Sebelum Makan', arab: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', arti: 'Ya Allah, berkahilah kami dalam rezeki yang Engkau berikan, dan jauhkanlah kami dari siksa api neraka.' },
  { judul: 'Doa Keluar Rumah', arab: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', arti: 'Dengan nama Allah, aku bertawakal kepada Allah, tidak ada daya dan kekuatan kecuali dengan pertolongan Allah.' },
  { judul: 'Doa Sebelum Belajar', arab: 'رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فَهْمًا', arti: 'Ya Tuhanku, tambahkanlah ilmu kepadaku dan berikanlah aku pemahaman yang baik.' },
  { judul: 'Doa Sebelum Tidur', arab: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', arti: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.' },
];

const HADITS_PILIHAN = [
  { teks: 'Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain.', sumber: 'HR. Ahmad' },
  { teks: 'Menuntut ilmu adalah wajib bagi setiap muslim.', sumber: 'HR. Ibnu Majah' },
  { teks: 'Barangsiapa menempuh jalan untuk mencari ilmu, Allah akan memudahkan baginya jalan ke surga.', sumber: 'HR. Muslim' },
  { teks: 'Tidak beriman salah seorang dari kalian sehingga ia mencintai saudaranya sebagaimana ia mencintai dirinya sendiri.', sumber: 'HR. Bukhari & Muslim' },
  { teks: 'Kebersihan adalah sebagian dari iman.', sumber: 'HR. Muslim' },
];

const MOTIVASI_ISLAMI = [
  'Allah tidak membebani seseorang melainkan sesuai kesanggupannya. (QS. Al-Baqarah: 286) — Kesulitan ujian yang kamu hadapi sudah diukur sesuai kemampuanmu.',
  'Boleh jadi kamu membenci sesuatu, padahal Allah menjadikan padanya kebaikan yang banyak. (QS. An-Nisa: 19) — Nilai yang kurang baik hari ini bisa jadi pelajaran besar untuk masa depan.',
  'Dan bahwa sesungguhnya usahamu itu kelak akan diperlihatkan kepadamu. (QS. An-Najm: 40) — Setiap jam belajarmu tidak akan sia-sia.',
  'Sesungguhnya bersama kesulitan ada kemudahan. (QS. Al-Insyirah: 6) — Tugas menumpuk hari ini, tapi kemudahan sudah menanti.',
];

export const registerIslamicModule = (bot: Telegraf<BotContext>): void => {
  bot.command('shalat', async (ctx) => {
    await sendPrayerTimes(ctx);
  });

  async function sendPrayerTimes(ctx: BotContext) {
    const city = (ctx.dbUser as any)?.settings?.city || config.prayer.defaultCity;
    const cacheKey = `prayer:${city}:${new Date().toDateString()}`;
    let times = await cache.get<Record<string, string>>(cacheKey);

    if (!times) {
      try {
        const res = await axios.get(
          `${config.prayer.apiUrl}/timingsByCity?city=${city}&country=${config.prayer.defaultCountry}&method=11`
        );
        times = res.data?.data?.timings as Record<string, string>;
        if (times) await cache.set(cacheKey, times, 3600);
      } catch {
        await ctx.reply('❌ Gagal mengambil jadwal shalat. Coba lagi nanti.');
        return;
      }
    }

    if (!times) { await ctx.reply('❌ Data jadwal tidak tersedia.'); return; }

    const text = `🕌 *Jadwal Shalat - ${city}*\n` +
      `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
      `🌅 Subuh: *${times.Fajr}*\n☀️ Dzuhur: *${times.Dhuhr}*\n🌤️ Ashar: *${times.Asr}*\n` +
      `🌆 Maghrib: *${times.Maghrib}*\n🌙 Isya: *${times.Isha}*\n\n` +
      `_اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ_`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  bot.action('shalat:today', async (ctx) => { await ctx.answerCbQuery(); await sendPrayerTimes(ctx); });

  bot.action('islamic:dzikir', async (ctx) => {
    await ctx.answerCbQuery();
    const dzikirList = [
      { arabic: 'سُبْحَانَ اللهِ', latin: 'Subhanallah', meaning: 'Maha Suci Allah', count: 33 },
      { arabic: 'الْحَمْدُ لِلَّهِ', latin: 'Alhamdulillah', meaning: 'Segala Puji bagi Allah', count: 33 },
      { arabic: 'اللهُ أَكْبَرُ', latin: 'Allahu Akbar', meaning: 'Allah Maha Besar', count: 33 },
      { arabic: 'لَا إِلَهَ إِلَّا اللهُ', latin: 'Laa ilaaha illallah', meaning: 'Tiada Tuhan selain Allah', count: 10 },
    ];
    let text = '📿 *Dzikir Pagi/Petang*\n\n';
    dzikirList.forEach((d) => { text += `${d.arabic}\n_${d.latin}_\n"${d.meaning}" (${d.count}x)\n\n`; });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('islamic:doa', async (ctx) => {
    await ctx.answerCbQuery();
    let text = '🤲 *Doa Harian Pilihan*\n\n';
    DOA_HARIAN.forEach((d) => { text += `*${d.judul}*\n${d.arab}\n_"${d.arti}"_\n\n`; });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('islamic:hadits', async (ctx) => {
    await ctx.answerCbQuery();
    const h = HADITS_PILIHAN[Math.floor(Math.random() * HADITS_PILIHAN.length)];
    await ctx.reply(`📜 *Hadits Hari Ini*\n\n"${h.teks}"\n\n— _${h.sumber}_`, { parse_mode: 'Markdown' });
  });

  bot.action('islamic:motivasi', async (ctx) => {
    await ctx.answerCbQuery();
    const m = MOTIVASI_ISLAMI[Math.floor(Math.random() * MOTIVASI_ISLAMI.length)];
    await ctx.reply(`💡 *Motivasi Islami*\n\n${m}`, { parse_mode: 'Markdown' });
  });

  bot.action('islamic:kiblat', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🧭 *Arah Kiblat*\n\nUntuk menghitung arah kiblat yang akurat dari lokasimu, bagikan lokasi dengan tombol di bawah:',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '📍 Bagikan Lokasi Saya', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  });

  // Handle shared location for Qibla calculation
  bot.on('location', async (ctx) => {
    const { latitude, longitude } = ctx.message.location;
    const bearing = calculateQiblaBearing(latitude, longitude);
    const compass = bearingToCompass(bearing);
    await ctx.reply(
      `🧭 *Arah Kiblat dari Lokasimu*\n\n` +
      `📐 Bearing: *${bearing}°* dari Utara\n` +
      `🧭 Arah perkiraan: *${compass}*\n\n` +
      `Gunakan kompas di HP-mu, arahkan ke ${bearing}° untuk menghadap Kiblat.`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
  });

  bot.hears('🕌 Islami', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🕌 Jadwal Shalat', 'shalat:today')],
      [Markup.button.callback('📿 Dzikir', 'islamic:dzikir')],
      [Markup.button.callback('🤲 Doa Harian', 'islamic:doa')],
      [Markup.button.callback('📜 Hadits', 'islamic:hadits')],
      [Markup.button.callback('💡 Motivasi Islami', 'islamic:motivasi')],
      [Markup.button.callback('🧭 Arah Kiblat', 'islamic:kiblat')],
    ]);
    await ctx.reply('🕌 *Pusat Islami*\n\nPilih menu:', { parse_mode: 'Markdown', ...keyboard });
  });
};
