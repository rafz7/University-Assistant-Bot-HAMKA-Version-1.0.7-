import { Telegraf } from 'telegraf';
import { BotContext } from '../middlewares';
import { aiRouter } from '../../services/providers/ai-router';
import { botLogger } from '../../utils/logger';
import axios from 'axios';
import { config } from '../../config';
import { FILE_ACTION_PROMPTS, FILE_ANALYSIS_PROMPT } from '../../config/prompts';
import { smartReply, smartReplyAfter } from '../../utils/telegram-reply';

export const registerFileHandler = (bot: Telegraf<BotContext>): void => {
  // Handle document uploads
  bot.on('document', async (ctx) => {
    const doc = ctx.message.document;
    const fileSize = doc.file_size || 0;
    const maxSize = config.upload.maxFileSizeMb * 1024 * 1024;

    if (fileSize > maxSize) {
      return ctx.reply(`❌ File terlalu besar. Maksimal ${config.upload.maxFileSizeMb}MB.`);
    }

    const ext = doc.file_name?.split('.').pop()?.toLowerCase() || '';
    if (!config.upload.allowedTypes.includes(ext)) {
      return ctx.reply(
        `❌ Format file tidak didukung.\n\n` +
        `Format yang didukung: ${config.upload.allowedTypes.join(', ')}`
      );
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Buat Ringkasan', callback_data: `file:summary:${doc.file_id}` }],
        [{ text: '❓ Buat Quiz', callback_data: `file:quiz:${doc.file_id}` }],
        [{ text: '🗺️ Buat Mindmap', callback_data: `file:mindmap:${doc.file_id}` }],
        [{ text: '🃏 Buat Flashcard', callback_data: `file:flashcard:${doc.file_id}` }],
        [{ text: '🔑 Ekstrak Keyword', callback_data: `file:keywords:${doc.file_id}` }],
        [{ text: '📓 Buat Catatan Belajar', callback_data: `file:notes:${doc.file_id}` }],
      ],
    };

    await ctx.reply(
      `📄 *File diterima!*\n\n` +
      `📎 *Nama:* ${doc.file_name}\n` +
      `📦 *Ukuran:* ${(fileSize / 1024).toFixed(1)}KB\n` +
      `📁 *Format:* ${ext.toUpperCase()}\n\n` +
      `Pilih aksi yang ingin dilakukan:`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  });

  // Handle file actions
  bot.action(/^file:(summary|quiz|mindmap|flashcard|keywords|notes):(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const match = ctx.match;
    const action = match[1];
    const fileId = match[2];

    const actionLabels: Record<string, string> = {
      summary: '📋 Membuat ringkasan',
      quiz: '❓ Membuat quiz',
      mindmap: '🗺️ Membuat mindmap',
      flashcard: '🃏 Membuat flashcard',
      keywords: '🔑 Mengekstrak keyword',
      notes: '📓 Membuat catatan belajar',
    };

    const typing = await ctx.reply(`${actionLabels[action]}... Harap tunggu.`);

    try {
      // Get file link from Telegram
      const fileLink = await ctx.telegram.getFileLink(fileId);

      // Download file content (for text-based files)
      let fileContent = '';
      try {
        const response = await axios.get(fileLink.toString(), {
          responseType: 'text',
          timeout: 15000,
        });
        fileContent = String(response.data).substring(0, 8000); // Limit content
      } catch {
        fileContent = '[File content extraction not available for this format]';
      }

      const response = await aiRouter.chat(
        [{ role: 'user', content: FILE_ACTION_PROMPTS[action](fileContent) }],
        FILE_ANALYSIS_PROMPT
      );

      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch (error) {
      botLogger.error('File processing error', { error });
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal memproses file. Pastikan file bisa dibaca dan coba lagi.');
    }
  });
};
