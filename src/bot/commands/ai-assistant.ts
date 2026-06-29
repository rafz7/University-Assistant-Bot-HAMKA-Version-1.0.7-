import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../middlewares';
import { aiRouter, AIMessage } from '../../services/providers/ai-router';
import { prisma } from '../../database';
import { botLogger } from '../../utils/logger';
import { smartReplyAfter } from '../../utils/telegram-reply';
import { GENERAL_SYSTEM_PROMPT, QUICK_AGENT_PROMPTS, QUICK_AGENT_LABELS } from '../../config/prompts';

const MAX_STORED_MESSAGE_CHARS = 4000; // cap what we persist, independent of router-side trimming

export const registerAICommands = (bot: Telegraf<BotContext>): void => {
  bot.command('ai', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📚 Academic Tutor', 'ai:academic')],
      [Markup.button.callback('🔬 Research Assistant', 'ai:research')],
      [Markup.button.callback('💻 Programming Tutor', 'ai:programming')],
      [Markup.button.callback('✍️ Writing Assistant', 'ai:writing')],
      [Markup.button.callback('📝 Proposal Generator', 'ai:proposal')],
      [Markup.button.callback('🎯 Quiz Generator', 'ai:quiz')],
      [Markup.button.callback('🗺️ Mindmap Generator', 'ai:mindmap')],
      [Markup.button.callback('💼 Career Assistant', 'ai:career')],
    ]);
    await ctx.reply('🤖 *AI Assistant UHAMKA*\n\nPilih jenis bantuan atau langsung ketik pertanyaan:', {
      parse_mode: 'Markdown', ...keyboard,
    });
  });

  Object.keys(QUICK_AGENT_PROMPTS).forEach((action) => {
    bot.action(action, async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        `🤖 *${QUICK_AGENT_LABELS[action]} aktif!*\n\nSilakan ketik pertanyaan Anda:`,
        { parse_mode: 'Markdown' }
      );
    });
  });

  bot.hears('🤖 AI Assistant', async (ctx) => {
    await ctx.reply('🤖 *AI Assistant*\n\nKetik /ai untuk pilih jenis bantuan, atau langsung tulis pertanyaan Anda!', { parse_mode: 'Markdown' });
  });

  // Let users self-recover if their conversation history ever gets too large
  // for the AI provider (e.g. after pasting a huge block of text).
  bot.command('resetai', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    await prisma.conversation.deleteMany({ where: { userId, agent: 'general' } });
    await ctx.reply('🔄 Riwayat chat AI kamu sudah dibersihkan. Mulai obrolan baru, yuk!');
  });

  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();
    const menuPrefixes = ['🏫', '🎓', '📊', '📖', '🤖', '📄', '🕌', '📈', '💼', '🌍', '⚙️', '📞'];
    if (menuPrefixes.some((p) => text.startsWith(p))) return next();

    const userId = ctx.dbUser?.id;
    if (!userId) return next();

    if (aiRouter.getStats().length === 0) {
      return ctx.reply('⚠️ AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY atau GROQ_API_KEY di file .env');
    }

    let typingMsg: any;
    try {
      typingMsg = await ctx.reply('⌛ Memproses...');

      const convId = `${userId}-general`;
      const conv = await prisma.conversation.findUnique({ where: { id: convId } });
      let history: AIMessage[] = [];
      if (conv) {
        try { history = JSON.parse(conv.messages as string).slice(-10); } catch {}
      }
      history.push({ role: 'user', content: text });

      const response = await aiRouter.chat(history, GENERAL_SYSTEM_PROMPT);

      // Cap what we persist so history can't grow unbounded turn over turn
      // (router also trims per-request, but this keeps the DB record itself small).
      const storedAssistantContent =
        response.content.length > MAX_STORED_MESSAGE_CHARS
          ? response.content.slice(0, MAX_STORED_MESSAGE_CHARS) + '\n…(disingkat di riwayat)'
          : response.content;
      history.push({ role: 'assistant', content: storedAssistantContent });

      await prisma.conversation.upsert({
        where: { id: convId },
        update: { messages: JSON.stringify(history), updatedAt: new Date() },
        create: { id: convId, userId, agent: 'general', messages: JSON.stringify(history) },
      });

      await smartReplyAfter(ctx, typingMsg?.message_id, response.content);
    } catch (error: any) {
      botLogger.error('AI response error', { error: error.message });
      try { if (typingMsg) await ctx.telegram.deleteMessage(ctx.chat.id, typingMsg.message_id); } catch {}
      const isRateLimit = /rate.?limit|too large|429|413/i.test(error.message || '');
      await ctx.reply(
        isRateLimit
          ? '❌ Server AI sedang sibuk/limit tercapai. Coba lagi sebentar, atau ketik /resetai jika ini terus terjadi.'
          : '❌ Maaf, terjadi kesalahan. Silakan coba lagi nanti.\n\nPastikan API key AI sudah diisi di .env'
      );
    }
  });
};
