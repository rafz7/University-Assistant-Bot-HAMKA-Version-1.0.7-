import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { aiRouter } from '../../services/providers/ai-router';
import { RESEARCH_PROMPTS } from '../../config/prompts';
import { prisma } from '../../database';
import { smartReply, smartReplyAfter } from '../../utils/telegram-reply';

export const registerResearchModule = (bot: Telegraf<BotContext>): void => {
  bot.hears('📖 Repository', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔍 Cari Skripsi', 'repo:thesis')],
      [Markup.button.callback('📄 Cari Jurnal', 'repo:journal')],
      [Markup.button.callback('🔬 Cari Penelitian', 'repo:research')],
      [Markup.button.callback('🤖 AI Summary', 'repo:summary')],
      [Markup.button.callback('📝 Citation Generator', 'repo:citation')],
      [Markup.button.callback('📚 Reference Formatter', 'repo:reference')],
      [Markup.button.callback('🧭 Research Assistant', 'repo:assistant')],
    ]);
    await ctx.reply('📖 *Research Repository*\n\nPilih layanan penelitian:', { parse_mode: 'Markdown', ...keyboard });
  });

  async function searchKnowledge(ctx: BotContext, query: string, category: string, label: string, externalHints: string) {
    const typing = await ctx.reply(`🔍 Mencari ${label}...`);
    try {
      const docs = await prisma.knowledgeDocument.findMany({
        where: {
          category,
          OR: [{ title: { contains: query } }, { content: { contains: query } }],
          isActive: true,
        },
        take: 5,
      });
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}

      if (docs.length === 0) {
        return ctx.reply(`🔍 Tidak ditemukan ${label} dengan topik "*${query}*" di database lokal.\n\n💡 Coba cari di:\n${externalHints}`, { parse_mode: 'Markdown' });
      }
      let text = `📚 *Hasil Pencarian: "${query}"*\n\n`;
      docs.forEach((d, i) => {
        text += `${i + 1}. *${d.title}*\n`;
        if (d.url) text += `   🔗 ${d.url}\n`;
        text += '\n';
      });
      await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal mencari. Coba lagi nanti.');
    }
  }

  bot.action('repo:thesis', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🔍 *Cari Skripsi*\n\nKetik: `/cariskripsi [topik atau judul]`\n\nContoh:\n`/cariskripsi machine learning kesehatan`", { parse_mode: 'Markdown' });
  });

  bot.command('cariskripsi', async (ctx) => {
    const query = ctx.message.text.replace('/cariskripsi ', '').trim();
    if (!query) return ctx.reply('Format: /cariskripsi [topik]\nContoh: /cariskripsi kecerdasan buatan');
    await searchKnowledge(ctx, query, 'THESIS', 'skripsi', '• repository.uhamka.ac.id\n• garuda.kemdikbud.go.id\n• scholar.google.com');
  });

  bot.action('repo:journal', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📄 *Cari Jurnal*\n\nKetik: `/carijurnal [topik]`\n\nContoh:\n`/carijurnal pendidikan islam`', { parse_mode: 'Markdown' });
  });

  bot.command('carijurnal', async (ctx) => {
    const query = ctx.message.text.replace('/carijurnal ', '').trim();
    if (!query) return ctx.reply('Format: /carijurnal [topik]\nContoh: /carijurnal manajemen pendidikan');
    await searchKnowledge(ctx, query, 'JOURNAL', 'jurnal', '• journal.uhamka.ac.id\n• sinta.kemdikbud.go.id\n• scholar.google.com\n• garuda.kemdikbud.go.id');
  });

  bot.action('repo:research', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🔬 *Cari Penelitian*\n\nKetik: `/caripenelitian [topik]`\n\nContoh:\n`/caripenelitian gizi anak`', { parse_mode: 'Markdown' });
  });

  bot.command('caripenelitian', async (ctx) => {
    const query = ctx.message.text.replace('/caripenelitian ', '').trim();
    if (!query) return ctx.reply('Format: /caripenelitian [topik]');
    await searchKnowledge(ctx, query, 'RESEARCH', 'penelitian', '• repository.uhamka.ac.id\n• sinta.kemdikbud.go.id');
  });

  bot.action('repo:summary', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🤖 *AI Summary*\n\nKirim teks atau tempel abstrak/isi jurnal yang ingin diringkas:\n`/ringkas [teks]`\n\n' +
      'Atau upload file PDF/DOCX lewat menu 📄 Analisis File untuk diringkas otomatis.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('ringkas', async (ctx) => {
    const text = ctx.message.text.replace('/ringkas ', '').trim();
    if (!text || text.length < 20) return ctx.reply('Format: /ringkas [teks min. 20 karakter]\n\nAtau upload file via menu 📄 Analisis File.');
    const typing = await ctx.reply('🤖 Meringkas...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Buat ringkasan akademik yang jelas dan terstruktur dari teks berikut, sertakan poin-poin utama:\n\n${text}` }],
        RESEARCH_PROMPTS.summarizer
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal membuat ringkasan. Coba lagi.');
    }
  });

  bot.action('repo:citation', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📝 *Citation Generator*\n\nKetik: `/sitasi [jenis] | [detail sumber]`\n\n*Jenis:* jurnal, buku, website, skripsi\n\n" +
      'Contoh:\n`/sitasi jurnal | Judul: Machine Learning | Penulis: Budi, A. | Tahun: 2023 | Jurnal: JIKI | Vol: 5 | Hal: 10-20`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('sitasi', async (ctx) => {
    const input = ctx.message.text.replace('/sitasi ', '').trim();
    if (!input) return ctx.reply('Format: /sitasi [jenis] | [detail sumber]');
    const typing = await ctx.reply('📝 Membuat sitasi...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Buat sitasi dalam format APA 7th Edition, IEEE, dan Chicago untuk: ${input}\n\nTampilkan ketiga format sitasi beserta penjelasan kapan masing-masing digunakan.` }],
        RESEARCH_PROMPTS.citationExpert
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal membuat sitasi. Coba lagi.');
    }
  });

  bot.action('repo:reference', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '📚 *Reference Formatter*\n\nTempel daftar pustaka berantakan, saya akan rapikan:\n`/rapikan [daftar referensi]`\n\n' +
      'Contoh:\n`/rapikan budi 2020 machine learning jurnal informatika vol 3`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('rapikan', async (ctx) => {
    const text = ctx.message.text.replace('/rapikan ', '').trim();
    if (!text) return ctx.reply('Format: /rapikan [referensi berantakan]');
    const typing = await ctx.reply('📚 Merapikan referensi...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Rapikan referensi berikut menjadi format daftar pustaka APA 7th Edition yang benar:\n\n${text}` }],
        RESEARCH_PROMPTS.referenceFormatter
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal merapikan referensi. Coba lagi.');
    }
  });

  bot.action('repo:assistant', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🧭 *Research Assistant*\n\n' +
      '• `/topikpenelitian [bidang]` — Rekomendasi topik penelitian\n' +
      '• `/metodologi [judul penelitian]` — Saran metodologi\n' +
      '• `/literaturreview [topik]` — Panduan literature review\n' +
      '• `/ringkas [teks]` — Ringkas teks akademik\n' +
      '• `/rapikan [referensi]` — Rapikan daftar pustaka',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('topikpenelitian', async (ctx) => {
    const field = ctx.message.text.replace('/topikpenelitian ', '').trim();
    if (!field) return ctx.reply('Format: /topikpenelitian [bidang]\nContoh: /topikpenelitian kesehatan masyarakat');
    const typing = await ctx.reply('🔬 Menganalisis topik penelitian...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Rekomendasikan 10 topik penelitian yang relevan dan potensial di bidang "${field}" untuk mahasiswa S1. Sertakan: judul yang menarik, rumusan masalah, tujuan, dan potensi kontribusi ilmiah.` }],
        RESEARCH_PROMPTS.topicAdvisor
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal memproses. Coba lagi.');
    }
  });

  bot.command('metodologi', async (ctx) => {
    const title = ctx.message.text.replace('/metodologi ', '').trim();
    if (!title) return ctx.reply('Format: /metodologi [judul penelitian]');
    const typing = await ctx.reply('🔬 Menyusun saran metodologi...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Sarankan metodologi penelitian yang tepat untuk judul: "${title}". Sertakan: jenis penelitian, pendekatan, populasi/sampel, teknik pengumpulan data, dan teknik analisis data yang cocok.` }],
        RESEARCH_PROMPTS.methodologyExpert
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal memproses. Coba lagi.');
    }
  });

  bot.command('literaturreview', async (ctx) => {
    const topic = ctx.message.text.replace('/literaturreview ', '').trim();
    if (!topic) return ctx.reply('Format: /literaturreview [topik]');
    const typing = await ctx.reply('🔬 Menyusun panduan literature review...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Buat panduan literature review untuk topik "${topic}". Sertakan: kata kunci pencarian yang efektif, database/sumber yang relevan, struktur penulisan literature review, dan cara mengidentifikasi research gap.` }],
        RESEARCH_PROMPTS.literatureReviewMentor
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal memproses. Coba lagi.');
    }
  });
};
