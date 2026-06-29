import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { aiRouter } from '../../services/providers/ai-router';
import { LANGUAGE_PROMPTS, TRANSLATOR_PROMPT } from '../../config/prompts';
import { smartReply, smartReplyAfter } from '../../utils/telegram-reply';

const LANG_FLAGS: Record<string, { flag: string; name: string }> = {
  english: { flag: '🇬🇧', name: 'English' },
  arabic: { flag: '🇸🇦', name: 'Arabic' },
  german: { flag: '🇩🇪', name: 'German' },
};

const LANG_META: Record<string, { flag: string; name: string; systemPrompt: string }> = Object.fromEntries(
  Object.entries(LANG_FLAGS).map(([key, val]) => [key, { ...val, systemPrompt: LANGUAGE_PROMPTS[key] }])
);

export const registerLanguageModule = (bot: Telegraf<BotContext>): void => {
  bot.hears('🌍 Bahasa', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🇬🇧 English', 'lang:english'), Markup.button.callback('🇸🇦 Arabic', 'lang:arabic')],
      [Markup.button.callback('🇩🇪 German', 'lang:german')],
    ]);
    await ctx.reply('🌍 *Language Center*\n\nPilih bahasa yang ingin dipelajari:', { parse_mode: 'Markdown', ...keyboard });
  });

  Object.entries(LANG_META).forEach(([lang, meta]) => {
    bot.action(`lang:${lang}`, async (ctx) => {
      await ctx.answerCbQuery();
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📚 Vocabulary', `lang:${lang}:vocab`)],
        [Markup.button.callback('📝 Grammar', `lang:${lang}:grammar`)],
        [Markup.button.callback('🎯 Daily Lesson', `lang:${lang}:daily`)],
        [Markup.button.callback('📊 Quiz', `lang:${lang}:quiz`)],
      ]);
      await ctx.reply(`${meta.flag} *${meta.name} Learning Center*\n\nPilih topik pembelajaran:`, { parse_mode: 'Markdown', ...keyboard });
    });

    bot.action(`lang:${lang}:vocab`, async (ctx) => {
      await ctx.answerCbQuery();
      const typing = await ctx.reply('📚 Menyiapkan kosakata...');
      try {
        const response = await aiRouter.chat(
          [{ role: 'user', content: `Berikan 10 kosakata ${lang} tingkat menengah untuk mahasiswa, lengkap dengan arti Bahasa Indonesia dan contoh kalimat singkat untuk masing-masing kata.` }],
          meta.systemPrompt
        );
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await smartReply(ctx, response.content);
      } catch {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await ctx.reply('❌ Gagal memuat kosakata. Coba lagi.');
      }
    });

    bot.action(`lang:${lang}:grammar`, async (ctx) => {
      await ctx.answerCbQuery();
      const typing = await ctx.reply('📝 Menyiapkan materi grammar...');
      try {
        const response = await aiRouter.chat(
          [{ role: 'user', content: `Jelaskan 1 poin grammar/tata bahasa ${lang} yang penting untuk pemula-menengah, lengkap dengan penjelasan sederhana, contoh kalimat, dan 2 latihan singkat.` }],
          meta.systemPrompt
        );
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await smartReply(ctx, response.content);
      } catch {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await ctx.reply('❌ Gagal memuat materi grammar. Coba lagi.');
      }
    });

    bot.action(`lang:${lang}:daily`, async (ctx) => {
      await ctx.answerCbQuery();
      const typing = await ctx.reply('📖 Menyiapkan pelajaran hari ini...');
      try {
        const response = await aiRouter.chat(
          [{ role: 'user', content: `Buat daily lesson ${lang} untuk mahasiswa Indonesia. Sertakan: 5 kosakata baru dengan contoh kalimat, 1 poin grammar penting, 1 latihan singkat, dan motivasi belajar bahasa.` }],
          meta.systemPrompt
        );
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await smartReply(ctx, response.content);
      } catch {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await ctx.reply('❌ Gagal memuat pelajaran. Coba lagi.');
      }
    });

    bot.action(`lang:${lang}:quiz`, async (ctx) => {
      await ctx.answerCbQuery();
      const typing = await ctx.reply('📊 Menyiapkan quiz...');
      try {
        const response = await aiRouter.chat(
          [{ role: 'user', content: `Buat 5 soal quiz pilihan ganda Bahasa ${lang} tingkat menengah untuk mahasiswa, lengkap dengan 4 pilihan jawaban dan kunci jawaban di akhir.` }],
          meta.systemPrompt
        );
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await smartReply(ctx, response.content);
      } catch {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
        await ctx.reply('❌ Gagal memuat quiz. Coba lagi.');
      }
    });
  });

  bot.command('translate', async (ctx) => {
    const args = ctx.message.text.replace('/translate ', '').split(' ke ');
    if (args.length < 2) return ctx.reply('Format: /translate [teks] ke [bahasa]\nContoh: /translate halo ke english');
    const [text, targetLang] = args;
    const typing = await ctx.reply('🌍 Menerjemahkan...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Terjemahkan teks berikut ke ${targetLang}: "${text}"\nBerikan juga penjelasan singkat tentang pilihan kata dan alternatif terjemahan jika ada.` }],
        TRANSLATOR_PROMPT
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, `🌍 *Terjemahan ke ${targetLang}*\n\n${response.content}`);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal menerjemahkan. Coba lagi.');
    }
  });
};
