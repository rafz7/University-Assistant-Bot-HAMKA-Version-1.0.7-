import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import axios from 'axios';
import { aiRouter } from '../../services/providers/ai-router';
import { smartReply, smartReplyAfter } from '../../utils/telegram-reply';
import { cache } from '../../services/redis';
import { prisma } from '../../database';
import { knowledgeLogger } from '../../utils/logger';

// Direct REST calls to equran.id v2 — same proven pattern as the working
// Prayer Times integration (plain axios, no unverified npm wrapper).
const QURAN_API = 'https://equran.id/api/v2';

const QARI_NAMES: Record<string, string> = {
  '01': 'Abdullah Al-Juhany',
  '02': 'Abdul Muhsin Al-Qasim',
  '03': 'Abdurrahman As-Sudais',
  '04': 'Ibrahim Al-Dossari',
  '05': 'Misyari Rasyid Al-Afasy',
};
const DEFAULT_QARI = '05';

function unwrap(res: any) {
  // v2 wraps payload as { data: {...} }; be defensive in case that ever changes.
  return res?.data?.data ?? res?.data;
}

async function getSurat(nomor: number): Promise<any> {
  const cacheKey = `quran:surat:${nomor}`;
  let data = await cache.get<any>(cacheKey);
  if (!data) {
    const res = await axios.get(`${QURAN_API}/surat/${nomor}`, { timeout: 10000 });
    data = unwrap(res);
    if (data) await cache.set(cacheKey, data, 86400);
  }
  if (!data) throw new Error('Surah tidak ditemukan');
  return data;
}

async function getTafsir(nomor: number): Promise<any> {
  const cacheKey = `quran:tafsir:${nomor}`;
  let data = await cache.get<any>(cacheKey);
  if (!data) {
    const res = await axios.get(`${QURAN_API}/tafsir/${nomor}`, { timeout: 10000 });
    data = unwrap(res);
    if (data) await cache.set(cacheKey, data, 86400);
  }
  if (!data) throw new Error('Tafsir tidak ditemukan');
  return data;
}

export const registerQuranModule = (bot: Telegraf<BotContext>): void => {
  bot.command('quran', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📖 Baca Al-Qur'an", 'quran:read')],
      [Markup.button.callback('🔍 Cari Ayat', 'quran:search')],
      [Markup.button.callback('🔖 Bookmark Saya', 'quran:bookmarks')],
      [Markup.button.callback('📊 Tracker Tilawah', 'quran:tracker')],
      [Markup.button.callback('📚 Tafsir', 'quran:tafsir')],
      [Markup.button.callback('🎵 Murottal', 'quran:murottal')],
    ]);
    await ctx.reply("📖 *Al-Qur'an Center*\n\nPilih menu:", { parse_mode: 'Markdown', ...keyboard });
  });

  bot.action('quran:read', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📖 *Baca Al-Qur'an*\n\nKetik nomor surah:\n`/surah [nomor]`\n\nContoh: `/surah 1` untuk Al-Fatihah\n\nBaca isi surah (ringkas):\n`/bacasurah [nomor]`\n\nBaca 1 ayat spesifik:\n`/ayah [surah]:[ayat]`\nContoh: `/ayah 2:255`",
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('surah', async (ctx) => {
    const surahNum = parseInt(ctx.message.text.split(' ')[1]);
    if (!surahNum || surahNum < 1 || surahNum > 114) {
      return ctx.reply('❌ Masukkan nomor surah yang valid (1-114).\nContoh: /surah 1');
    }
    try {
      const surat = await getSurat(surahNum);
      await ctx.reply(
        `📖 *Surah ${surat.namaLatin} (${surat.nama})*\n` +
        `🔢 Surah ke-${surahNum} | ${surat.jumlahAyat} ayat | ${surat.tempatTurun}\n` +
        `💬 Arti: _${surat.arti}_\n\n` +
        `Ketik \`/ayah ${surahNum}:1\` untuk baca ayat 1, atau \`/bacasurah ${surahNum}\` untuk baca ringkas.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      knowledgeLogger.error('Quran /surah error', { err });
      await ctx.reply("❌ Gagal mengambil data surah. Coba lagi sebentar, atau pastikan nomor surah benar (1-114).");
    }
  });

  bot.command('bacasurah', async (ctx) => {
    const surahNum = parseInt(ctx.message.text.split(' ')[1]);
    if (!surahNum || surahNum < 1 || surahNum > 114) {
      return ctx.reply('Format: /bacasurah [nomor 1-114]');
    }
    const typing = await ctx.reply('📖 Mengambil surah...');
    try {
      const surat = await getSurat(surahNum);
      const maxPreview = 15;
      let text = `📖 *${surat.namaLatin} (${surat.nama})*\n${surat.tempatTurun} • ${surat.jumlahAyat} ayat\n\n`;
      (surat.ayat || []).slice(0, maxPreview).forEach((a: any) => {
        text += `*[${a.nomorAyat}]* ${a.teksArab}\n_${a.teksIndonesia}_\n\n`;
      });
      if ((surat.ayat || []).length > maxPreview) {
        text += `\n📌 Menampilkan ${maxPreview} dari ${surat.ayat.length} ayat. Lanjut: \`/ayah ${surahNum}:${maxPreview + 1}\``;
      }
      await smartReplyAfter(ctx, typing.message_id, text);
    } catch (err) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      knowledgeLogger.error('Quran /bacasurah error', { err });
      await ctx.reply('❌ Gagal mengambil surah. Coba lagi sebentar.');
    }
  });

  bot.command('ayah', async (ctx) => {
    const parts = ctx.message.text.split(' ')[1]?.split(':');
    if (!parts || parts.length < 2) return ctx.reply('Format: /ayah [surah]:[ayat]\nContoh: /ayah 2:255');
    const surahNum = parseInt(parts[0]);
    const ayahNum = parseInt(parts[1]);
    if (!surahNum || !ayahNum) return ctx.reply('Format: /ayah [surah]:[ayat]\nContoh: /ayah 2:255');

    try {
      const surat = await getSurat(surahNum);
      const ayat = (surat.ayat || []).find((a: any) => a.nomorAyat === ayahNum);
      if (!ayat) return ctx.reply(`❌ Ayat ${ayahNum} tidak ditemukan di surah ini (total ${surat.jumlahAyat} ayat).`);

      const text =
        `📖 *QS. ${surat.namaLatin} ${surahNum}:${ayahNum}*\n\n${ayat.teksArab}\n\n_${ayat.teksIndonesia}_\n\n` +
        `🔖 \`/bookmark ${surahNum} ${ayahNum}\` — simpan\n📚 \`/tafsir ${surahNum}:${ayahNum}\` — tafsir\n🎵 \`/murottal ${surahNum} ${ayahNum}\` — dengarkan`;
      await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch (err) {
      knowledgeLogger.error('Quran /ayah error', { err });
      await ctx.reply('❌ Gagal mengambil ayat. Pastikan nomor surah & ayat benar.');
    }
  });

  bot.action('quran:search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🔍 *Cari Ayat*\n\nKetik topik/kata kunci, AI akan carikan ayat yang relevan:\n`/cariayat [topik]`\n\nContoh:\n`/cariayat sabar`\n`/cariayat rezeki`",
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('cariayat', async (ctx) => {
    const query = ctx.message.text.replace('/cariayat ', '').trim();
    if (!query) return ctx.reply('Format: /cariayat [topik]\nContoh: /cariayat sabar');

    const typing = await ctx.reply('🔍 Mencari ayat relevan...');
    try {
      const suggestion = await aiRouter.chat(
        [{ role: 'user', content: `Sebutkan 4 referensi ayat Al-Qur'an (format surah:ayat, contoh "2:153") yang paling relevan dengan topik "${query}". HANYA balas dengan daftar referensi dipisah koma, tanpa teks lain. Contoh balasan: 2:153,3:200,94:5,65:3` }],
        "Anda adalah ahli Al-Qur'an. Jawab singkat hanya dengan referensi ayat, format persis 'surah:ayat,surah:ayat'."
      );

      const refs = suggestion.content.match(/\d{1,3}:\d{1,3}/g)?.slice(0, 4) || [];
      if (refs.length === 0) {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        return ctx.reply(`🔍 Tidak menemukan ayat spesifik untuk "*${query}*". Coba kata kunci lain.`, { parse_mode: 'Markdown' });
      }

      let text = `🔍 *Ayat terkait "${query}"*\n\n`;
      for (const ref of refs) {
        const [s, a] = ref.split(':').map(Number);
        try {
          const surat = await getSurat(s);
          const ayat = (surat.ayat || []).find((x: any) => x.nomorAyat === a);
          if (ayat) text += `📖 *QS. ${surat.namaLatin} ${ref}*\n${ayat.teksArab}\n_${ayat.teksIndonesia}_\n\n`;
        } catch { /* skip invalid ref silently */ }
      }
      await smartReplyAfter(ctx, typing.message_id, text);
    } catch (err) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      knowledgeLogger.error('cariayat error', { err });
      await ctx.reply('❌ Gagal mencari ayat. Coba lagi nanti.');
    }
  });

  bot.command('bookmark', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const parts = ctx.message.text.split(' ');
    const surahNum = parseInt(parts[1]);
    const ayahNum = parseInt(parts[2]);
    if (!surahNum || !ayahNum) return ctx.reply('Format: /bookmark [surah] [ayat]\nContoh: /bookmark 2 255');

    let surahName = `Surah ${surahNum}`;
    try { surahName = (await getSurat(surahNum)).namaLatin; } catch {}

    await prisma.quranBookmark.create({ data: { userId, surahNumber: surahNum, ayahNumber: ayahNum, surahName } });
    await ctx.reply(`✅ QS. ${surahName} ${surahNum}:${ayahNum} disimpan ke bookmark!`);
  });

  bot.action('quran:bookmarks', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const bookmarks = await prisma.quranBookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 });
    if (bookmarks.length === 0) return ctx.reply('🔖 Belum ada bookmark. Baca ayat dan simpan dengan /bookmark [surah] [ayat].');
    let text = "🔖 *Bookmark Al-Qur'an*\n\n";
    bookmarks.forEach((b, i) => {
      text += `${i + 1}. *QS. ${b.surahName} ${b.surahNumber}:${b.ayahNumber}*\n`;
      if (b.note) text += `   📝 ${b.note}\n`;
      text += '\n';
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('quran:tafsir', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("📚 *Tafsir*\n\nKetik: `/tafsir [surah]:[ayat]`\n\nContoh: `/tafsir 2:255`", { parse_mode: 'Markdown' });
  });

  bot.command('tafsir', async (ctx) => {
    const ref = ctx.message.text.replace('/tafsir ', '').trim();
    const [surahNum, ayahNum] = ref.split(':').map(Number);
    if (!surahNum || !ayahNum) return ctx.reply('Format: /tafsir [surah]:[ayat]\nContoh: /tafsir 2:255');

    const typing = await ctx.reply('📚 Mengambil tafsir...');
    try {
      const tafsirData = await getTafsir(surahNum);
      const entry = (tafsirData.tafsir || []).find((t: any) => t.ayat === ayahNum);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      if (!entry) return ctx.reply(`❌ Tafsir untuk ayat ${ayahNum} tidak ditemukan.`);
      await smartReply(ctx, `📚 *Tafsir QS. ${surahNum}:${ayahNum}*\n\n${entry.teks}`);
    } catch (err) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      knowledgeLogger.error('Quran /tafsir error', { err });
      await ctx.reply('❌ Gagal mengambil tafsir. Coba lagi nanti.');
    }
  });

  bot.action('quran:murottal', async (ctx) => {
    await ctx.answerCbQuery();
    let text = '🎵 *Murottal Tersedia*\n\n';
    Object.entries(QARI_NAMES).forEach(([id, name]) => { text += `• ${name} (id: ${id})\n`; });
    text += '\nKetik: `/murottal [surah] [ayat] [id qari opsional]`\nContoh: `/murottal 1 1` atau `/murottal 1 1 03`';
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.command('murottal', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const surahNum = parseInt(parts[1]);
    const ayahNum = parseInt(parts[2]);
    const qariId = parts[3] && QARI_NAMES[parts[3]] ? parts[3] : DEFAULT_QARI;
    if (!surahNum || !ayahNum) return ctx.reply('Format: /murottal [surah] [ayat]\nContoh: /murottal 1 1');

    const typing = await ctx.reply('🎵 Menyiapkan audio...');
    try {
      const surat = await getSurat(surahNum);
      const ayat = (surat.ayat || []).find((a: any) => a.nomorAyat === ayahNum);
      const audioUrl = ayat?.audio?.[qariId];
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      if (!audioUrl) return ctx.reply('❌ Audio tidak ditemukan untuk ayat ini.');
      await ctx.replyWithAudio(
        { url: audioUrl },
        { title: `QS. ${surat.namaLatin} ${surahNum}:${ayahNum}`, performer: QARI_NAMES[qariId] }
      );
    } catch (err) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      knowledgeLogger.error('Quran /murottal error', { err });
      await ctx.reply('❌ Gagal memuat audio. Coba lagi nanti.');
    }
  });

  bot.action('quran:tracker', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await prisma.habitLog.findMany({ where: { userId, date: { gte: sevenDaysAgo }, tilawah: true } });
    const totalBookmarks = await prisma.quranBookmark.count({ where: { userId } });

    const text = `📊 *Tracker Tilawah*\n\n` +
      `📅 Tilawah 7 hari terakhir: *${logs.length}/7* hari\n` +
      `${'✅'.repeat(logs.length)}${'⬜'.repeat(7 - logs.length)}\n\n` +
      `🔖 Total ayat di-bookmark: *${totalBookmarks}*\n\nTandai tilawah harianmu lewat menu /habit ya!`;
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });
};
