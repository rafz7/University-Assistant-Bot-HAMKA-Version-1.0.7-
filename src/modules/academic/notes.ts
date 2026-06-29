import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { prisma } from '../../database';

export const registerNotesCommands = (bot: Telegraf<BotContext>): void => {
  bot.command('catatan', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Tambah Catatan', 'notes:add')],
      [Markup.button.callback('📋 Lihat Catatan', 'notes:list')],
      [Markup.button.callback('🔍 Cari Catatan', 'notes:search')],
      [Markup.button.callback('📌 Catatan Terpin', 'notes:pinned')],
    ]);
    await ctx.reply('📓 *Catatan Kuliah*\n\nPilih aksi:', { parse_mode: 'Markdown', ...keyboard });
  });

  bot.action('notes:add', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '➕ *Tambah Catatan*\n\nKetik dengan format:\n`/addcatatan Judul`\n`Isi catatan di baris berikutnya...`\n\n' +
      'Contoh:\n`/addcatatan Rangkuman Aljabar Linear`\n`Matriks adalah susunan angka dalam baris dan kolom...`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('notes:list', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const notes = await prisma.note.findMany({ where: { userId }, orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }], take: 10 });
    if (notes.length === 0) return ctx.reply('📓 Belum ada catatan. Tambahkan dengan tombol ➕ atau /addcatatan.');
    let text = '📓 *Catatan Kuliah*\n\n';
    notes.forEach((n, i) => {
      text += `${n.isPinned ? '📌 ' : ''}${i + 1}. *${n.title}*\n`;
      if (n.category) text += `   🏷️ ${n.category}\n`;
      text += `   ${n.content.substring(0, 80)}${n.content.length > 80 ? '...' : ''}\n\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('notes:pinned', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const notes = await prisma.note.findMany({ where: { userId, isPinned: true }, orderBy: { updatedAt: 'desc' } });
    if (notes.length === 0) {
      return ctx.reply('📌 Belum ada catatan yang di-pin.\n\nGunakan `/pincatatan [judul]` untuk men-pin catatan penting.', { parse_mode: 'Markdown' });
    }
    let text = '📌 *Catatan Ter-pin*\n\n';
    notes.forEach((n, i) => {
      text += `${i + 1}. *${n.title}*\n${n.content.substring(0, 150)}${n.content.length > 150 ? '...' : ''}\n\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('notes:search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🔍 *Cari Catatan*\n\nKetik: `/caricatatan [kata kunci]`\n\nContoh: `/caricatatan aljabar`', { parse_mode: 'Markdown' });
  });

  bot.command('caricatatan', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const query = ctx.message.text.replace('/caricatatan ', '').trim();
    if (!query) return ctx.reply('Format: /caricatatan [kata kunci]');

    const notes = await prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    const lowerQuery = query.toLowerCase();
    const matched = notes.filter(
      (n) => n.title.toLowerCase().includes(lowerQuery) || n.content.toLowerCase().includes(lowerQuery)
    );

    if (matched.length === 0) return ctx.reply(`🔍 Tidak ditemukan catatan dengan kata kunci "*${query}*".`, { parse_mode: 'Markdown' });

    let text = `🔍 *Hasil Pencarian: "${query}"*\n\n`;
    matched.slice(0, 10).forEach((n, i) => {
      text += `${i + 1}. *${n.title}*\n${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}\n\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.command('pincatatan', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const title = ctx.message.text.replace('/pincatatan ', '').trim();
    if (!title) return ctx.reply('Format: /pincatatan [judul catatan]');

    const note = await prisma.note.findFirst({ where: { userId, title: { contains: title } } });
    if (!note) return ctx.reply(`❌ Catatan dengan judul "*${title}*" tidak ditemukan.`, { parse_mode: 'Markdown' });

    await prisma.note.update({ where: { id: note.id }, data: { isPinned: !note.isPinned } });
    await ctx.reply(`${!note.isPinned ? '📌 Catatan di-pin!' : '📌 Pin catatan dilepas.'} *${note.title}*`, { parse_mode: 'Markdown' });
  });

  bot.command('addcatatan', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const parts = ctx.message.text.replace('/addcatatan ', '').split('\n');
    if (parts.length < 2) return ctx.reply('Format:\n/addcatatan Judul\nIsi catatan di sini...');
    const [title, ...contentParts] = parts;
    const content = contentParts.join('\n').trim();
    await prisma.note.create({ data: { userId, title, content } });
    await ctx.reply(`✅ Catatan *"${title}"* disimpan!`, { parse_mode: 'Markdown' });
  });
};
