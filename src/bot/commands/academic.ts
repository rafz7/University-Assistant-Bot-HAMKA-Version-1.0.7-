import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../middlewares';
import { prisma } from '../../database';

const PRIORITY_EMOJI: Record<string, string> = { URGENT: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };

export const registerAcademicCommands = (bot: Telegraf<BotContext>): void => {
  bot.command('tugas', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Tambah Tugas', 'task:add')],
      [Markup.button.callback('📋 Lihat Tugas', 'task:list')],
      [Markup.button.callback('⚠️ Tugas Mendesak', 'task:urgent')],
      [Markup.button.callback('✅ Selesai', 'task:completed')],
      [Markup.button.callback('📊 Statistik', 'task:stats')],
    ]);
    await ctx.reply('🎓 *Manajemen Tugas*\n\nPilih aksi:', { parse_mode: 'Markdown', ...keyboard });
  });

  bot.command('jadwal', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return ctx.reply('Silakan /start terlebih dahulu.');
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayName = days[new Date().getDay()];
    const schedules = await prisma.schedule.findMany({ where: { userId, day: todayName, isActive: true }, orderBy: { startTime: 'asc' } });
    if (schedules.length === 0) {
      return ctx.reply(
        '📅 Tidak ada jadwal kuliah hari ini. 🎉\n\n' +
        '_Belum atur jadwal kuliahmu di bot ini? Tambahkan lewat admin/dosen wali, atau cek kalender akademik di menu 🏫 UHAMKA → Kalender Akademik untuk tahu masa KRS/perkuliahan saat ini._',
        { parse_mode: 'Markdown' }
      );
    }
    let text = `📅 *Jadwal Kuliah Hari Ini*\n\n`;
    schedules.forEach((s) => {
      text += `🕐 *${s.startTime} - ${s.endTime}*\n📚 ${s.subject}\n`;
      if (s.room) text += `🏫 Ruang: ${s.room}\n`;
      if (s.lecturer) text += `👨‍🏫 Dosen: ${s.lecturer}\n`;
      text += '\n';
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('task:add', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '➕ *Tambah Tugas Baru*\n\n`/addtask Judul | Mata Kuliah | Deadline (DD/MM/YYYY) | Prioritas (low/medium/high)`\n\n' +
      'Contoh:\n`/addtask UTS Pemrograman | Algoritma | 25/12/2026 | high`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('task:list', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 10,
    });
    if (tasks.length === 0) return ctx.reply('✅ Tidak ada tugas aktif. Kamu bebas! 🎉');
    let text = '📋 *Tugas Aktif*\n\n';
    tasks.forEach((t, i) => {
      const emoji = PRIORITY_EMOJI[t.priority] || '⚪';
      const due = t.dueDate ? `📅 ${new Date(t.dueDate).toLocaleDateString('id-ID')}` : '';
      text += `${i + 1}. ${emoji} *${t.title}*\n`;
      if (t.subject) text += `   📚 ${t.subject}\n`;
      if (due) text += `   ${due}\n`;
      text += '\n';
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('task:urgent', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        OR: [{ priority: { in: ['HIGH', 'URGENT'] } }, { dueDate: { lte: sevenDays } }],
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
    if (tasks.length === 0) return ctx.reply('✅ Tidak ada tugas mendesak saat ini. Aman! 😌');
    let text = '⚠️ *Tugas Mendesak*\n\n';
    tasks.forEach((t, i) => {
      const emoji = PRIORITY_EMOJI[t.priority] || '⚪';
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString('id-ID') : 'Tanpa deadline';
      text += `${i + 1}. ${emoji} *${t.title}* — ${due}\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('task:completed', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const tasks = await prisma.task.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });
    if (tasks.length === 0) return ctx.reply('📭 Belum ada tugas yang diselesaikan.\n\nGunakan `/selesaitugas [judul]` untuk menandai tugas selesai.', { parse_mode: 'Markdown' });
    let text = '✅ *Tugas Selesai*\n\n';
    tasks.forEach((t, i) => {
      const done = t.completedAt ? new Date(t.completedAt).toLocaleDateString('id-ID') : '';
      text += `${i + 1}. *${t.title}* — ${done}\n`;
    });
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.command('selesaitugas', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const title = ctx.message.text.replace('/selesaitugas ', '').trim();
    if (!title) return ctx.reply('Format: /selesaitugas [judul tugas]');
    const task = await prisma.task.findFirst({ where: { userId, title: { contains: title }, status: { not: 'COMPLETED' } } });
    if (!task) return ctx.reply(`❌ Tugas dengan judul mengandung "*${title}*" tidak ditemukan.`, { parse_mode: 'Markdown' });
    await prisma.task.update({ where: { id: task.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    await ctx.reply(`🎉 Tugas *${task.title}* ditandai selesai! Kerja bagus! 💪`, { parse_mode: 'Markdown' });
  });

  bot.action('task:stats', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const [pending, inProgress, completed, overdue, total] = await Promise.all([
      prisma.task.count({ where: { userId, status: 'PENDING' } }),
      prisma.task.count({ where: { userId, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.task.count({ where: { userId, status: 'OVERDUE' } }),
      prisma.task.count({ where: { userId } }),
    ]);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const text = `📊 *Statistik Tugas*\n\n` +
      `📝 Pending: *${pending}*\n🔄 Dikerjakan: *${inProgress}*\n✅ Selesai: *${completed}*\n⏰ Terlambat: *${overdue}*\n\n` +
      `📈 Total: *${total}* tugas\n🎯 Tingkat Penyelesaian: *${completionRate}%*\n` +
      `${'█'.repeat(Math.floor(completionRate / 10))}${'░'.repeat(10 - Math.floor(completionRate / 10))}`;
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.command('addtask', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const args = ctx.message.text.replace('/addtask ', '').split('|').map((s) => s.trim());
    if (args.length < 1) return ctx.reply('Format: /addtask Judul | Mata Kuliah | Deadline | Prioritas');

    const [title, subject, deadlineStr, priority] = args;
    let dueDate: Date | undefined;
    if (deadlineStr) {
      const [dd, mm, yyyy] = deadlineStr.split('/');
      if (dd && mm && yyyy) dueDate = new Date(`${yyyy}-${mm}-${dd}`);
    }
    const validPriority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority?.toUpperCase()) ? priority.toUpperCase() : 'MEDIUM';

    await prisma.task.create({
      data: { userId, title, subject: subject || undefined, dueDate: dueDate || undefined, priority: validPriority },
    });
    await ctx.reply(`✅ Tugas *${title}* berhasil ditambahkan!`, { parse_mode: 'Markdown' });
  });
};
