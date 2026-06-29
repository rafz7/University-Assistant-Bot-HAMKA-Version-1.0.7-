import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { prisma } from '../../database';
import { aiRouter } from '../../services/providers/ai-router';

function calcGpaFromList(transcripts: { gradePoint: number; credits: number }[]): number {
  const totalCredits = transcripts.reduce((s, t) => s + t.credits, 0);
  const totalPoints = transcripts.reduce((s, t) => s + t.gradePoint * t.credits, 0);
  return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
}

export const registerTranscriptModule = (bot: Telegraf<BotContext>): void => {
  bot.command('transkrip', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Tambah Nilai', 'transcript:add')],
      [Markup.button.callback('📋 Lihat Transkrip', 'transcript:view')],
      [Markup.button.callback('📊 IPS & IPK', 'transcript:gpa')],
      [Markup.button.callback('🎯 Target IPK', 'transcript:target')],
      [Markup.button.callback('📈 Prediksi IPK', 'transcript:predict')],
      [Markup.button.callback('📊 Analisis Semester', 'transcript:analytics')],
    ]);
    await ctx.reply('📊 *Transkrip Akademik*\n\nPilih aksi:', { parse_mode: 'Markdown', ...keyboard });
  });

  bot.action('transcript:add', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '➕ *Tambah Nilai*\n\nKetik: `/addnilai [Matkul] | [SKS] | [Nilai] | [Semester]`\n\n' +
      'Contoh:\n`/addnilai Kalkulus I | 3 | A | 1`\n\nNilai valid: A, A-, B+, B, B-, C+, C, C-, D, E',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('transcript:view', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const transcripts = await prisma.transcript.findMany({ where: { userId }, orderBy: [{ semester: 'asc' }, { createdAt: 'asc' }] });
    if (transcripts.length === 0) return ctx.reply('📊 Belum ada data transkrip. Tambahkan dengan tombol ➕ atau /addnilai.');

    let text = '📋 *Transkrip Lengkap*\n\n';
    let currentSem = -1;
    transcripts.forEach((t) => {
      if (t.semester !== currentSem) {
        currentSem = t.semester;
        text += `\n*— Semester ${currentSem} —*\n`;
      }
      text += `${t.subject} (${t.credits} SKS) — *${t.grade}*\n`;
    });
    text += `\n🏆 IPK saat ini: *${calcGpaFromList(transcripts)}*`;
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('transcript:gpa', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const transcripts = await prisma.transcript.findMany({ where: { userId } });
    if (transcripts.length === 0) return ctx.reply('📊 Belum ada data transkrip. Tambahkan nilai terlebih dahulu.');

    const semesters = new Map<number, { totalPoints: number; totalCredits: number }>();
    transcripts.forEach((t) => {
      const sem = semesters.get(t.semester) || { totalPoints: 0, totalCredits: 0 };
      sem.totalPoints += t.gradePoint * t.credits;
      sem.totalCredits += t.credits;
      semesters.set(t.semester, sem);
    });

    const ipk = calcGpaFromList(transcripts);
    const totalCredits = transcripts.reduce((sum, t) => sum + t.credits, 0);

    let text = `📊 *Rekap IPK*\n\n`;
    Array.from(semesters.entries()).sort((a, b) => a[0] - b[0]).forEach(([sem, data]) => {
      const ips = (data.totalPoints / data.totalCredits).toFixed(2);
      text += `Semester ${sem}: IPS *${ips}* (${data.totalCredits} SKS)\n`;
    });
    text += `\n🏆 *IPK Kumulatif: ${ipk}*\n📚 Total SKS: ${totalCredits}`;
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('transcript:target', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const profile = await prisma.academicProfile.findUnique({ where: { userId } });
    if (profile?.targetGpa) {
      const transcripts = await prisma.transcript.findMany({ where: { userId } });
      const currentGpa = calcGpaFromList(transcripts);
      const gap = (profile.targetGpa - currentGpa).toFixed(2);
      await ctx.reply(
        `🎯 *Target IPK*\n\nTarget: *${profile.targetGpa}*\nIPK saat ini: *${currentGpa}*\n` +
        `${currentGpa >= profile.targetGpa ? '✅ Target sudah tercapai! 🎉' : `📈 Selisih: ${gap} poin lagi`}\n\n` +
        `Ketik \`/settarget [angka]\` untuk ubah target.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply('🎯 *Target IPK*\n\nBelum ada target diatur.\n\nKetik: `/settarget [angka]`\nContoh: `/settarget 3.7`', { parse_mode: 'Markdown' });
    }
  });

  bot.command('settarget', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const value = parseFloat(ctx.message.text.replace('/settarget ', '').trim());
    if (isNaN(value) || value < 0 || value > 4) return ctx.reply('Format: /settarget [angka 0-4]\nContoh: /settarget 3.7');

    await prisma.academicProfile.upsert({
      where: { userId },
      update: { targetGpa: value },
      create: { userId, targetGpa: value },
    });
    await ctx.reply(`🎯 Target IPK diatur ke *${value}*. Semangat mengejarnya! 💪`, { parse_mode: 'Markdown' });
  });

  bot.action('transcript:predict', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const [transcripts, profile] = await Promise.all([
      prisma.transcript.findMany({ where: { userId } }),
      prisma.academicProfile.findUnique({ where: { userId } }),
    ]);

    if (transcripts.length === 0) return ctx.reply('📈 Belum ada data nilai untuk diprediksi. Tambahkan nilai dulu ya.');

    const currentGpa = calcGpaFromList(transcripts);
    const totalCreditsSoFar = transcripts.reduce((s, t) => s + t.credits, 0);
    const totalSks = 144; // standar S1
    const remainingCredits = Math.max(totalSks - totalCreditsSoFar, 0);
    const targetGpa = profile?.targetGpa;

    let text = `📈 *Prediksi IPK*\n\n`;
    text += `IPK saat ini: *${currentGpa}* (${totalCreditsSoFar}/${totalSks} SKS)\n\n`;

    if (remainingCredits === 0) {
      text += `🎓 SKS sudah mencukupi standar kelulusan S1 (144 SKS)!`;
    } else if (targetGpa) {
      // points needed: (target*144 - current*totalSoFar) / remaining
      const pointsNeeded = (targetGpa * totalSks - currentGpa * totalCreditsSoFar) / remainingCredits;
      text += `Sisa SKS: *${remainingCredits}*\n`;
      if (pointsNeeded > 4) {
        text += `⚠️ Target *${targetGpa}* sudah tidak memungkinkan tercapai secara matematis dengan sisa SKS ini.`;
      } else if (pointsNeeded <= 0) {
        text += `✅ Target *${targetGpa}* sudah pasti tercapai bahkan dengan nilai minimal di sisa mata kuliah!`;
      } else {
        text += `Untuk mencapai target IPK *${targetGpa}*, rata-rata nilai di sisa mata kuliah harus mencapai poin *${pointsNeeded.toFixed(2)}* (skala 4.0).`;
      }
    } else {
      text += `Sisa SKS: *${remainingCredits}*\n\nAtur target IPK dulu dengan \`/settarget [angka]\` untuk melihat proyeksi lengkap.`;
    }

    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.action('transcript:analytics', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const transcripts = await prisma.transcript.findMany({ where: { userId } });
    if (transcripts.length === 0) return ctx.reply('📊 Belum ada data untuk dianalisis.');

    const semesters = new Map<number, { totalPoints: number; totalCredits: number; count: number }>();
    transcripts.forEach((t) => {
      const sem = semesters.get(t.semester) || { totalPoints: 0, totalCredits: 0, count: 0 };
      sem.totalPoints += t.gradePoint * t.credits;
      sem.totalCredits += t.credits;
      sem.count += 1;
      semesters.set(t.semester, sem);
    });

    const sortedSems = Array.from(semesters.entries()).sort((a, b) => a[0] - b[0]);
    let text = '📊 *Analisis Semester*\n\n';
    let prevIps: number | null = null;
    sortedSems.forEach(([sem, data]) => {
      const ips = data.totalPoints / data.totalCredits;
      let trend = '';
      if (prevIps !== null) trend = ips > prevIps ? ' 📈' : ips < prevIps ? ' 📉' : ' ➡️';
      text += `Semester ${sem}: IPS *${ips.toFixed(2)}*${trend} (${data.count} matkul, ${data.totalCredits} SKS)\n`;
      prevIps = ips;
    });

    const gradeCount: Record<string, number> = {};
    transcripts.forEach((t) => { gradeCount[t.grade] = (gradeCount[t.grade] || 0) + 1; });
    text += `\n📋 *Distribusi Nilai:*\n`;
    Object.entries(gradeCount).sort().forEach(([grade, count]) => { text += `${grade}: ${count} matkul\n`; });

    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.command('addnilai', async (ctx) => {
    const userId = ctx.dbUser?.id;
    if (!userId) return;
    const args = ctx.message.text.replace('/addnilai ', '').split('|').map((s) => s.trim());
    if (args.length < 4) return ctx.reply('Format: /addnilai Matkul | SKS | Nilai (A/B+/B/C+/C/D/E) | Semester');

    const [subject, creditsStr, grade, semStr] = args;
    const gradeMap: Record<string, number> = {
      A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7,
      'C+': 2.3, C: 2.0, 'C-': 1.7, D: 1.0, E: 0.0,
    };
    const gradePoint = gradeMap[grade.toUpperCase()] ?? 0;
    await prisma.transcript.create({
      data: {
        userId, subject,
        credits: parseInt(creditsStr) || 3,
        grade: grade.toUpperCase(),
        gradePoint,
        semester: parseInt(semStr) || 1,
        year: new Date().getFullYear().toString(),
      },
    });
    await ctx.reply(`✅ Nilai *${subject}* (${grade}) berhasil ditambahkan!`, { parse_mode: 'Markdown' });
  });
};
