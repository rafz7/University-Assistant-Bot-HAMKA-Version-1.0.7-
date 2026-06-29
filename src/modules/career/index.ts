import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { aiRouter } from '../../services/providers/ai-router';
import { CAREER_PROMPTS } from '../../config/prompts';
import { smartReply, smartReplyAfter } from '../../utils/telegram-reply';

export const registerCareerModule = (bot: Telegraf<BotContext>): void => {
  bot.hears('💼 Karir', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📄 CV Builder', 'career:cv')],
      [Markup.button.callback('🖼️ Portfolio Builder', 'career:portfolio')],
      [Markup.button.callback('💼 LinkedIn Optimizer', 'career:linkedin')],
      [Markup.button.callback('🔍 Cari Magang', 'career:internship')],
      [Markup.button.callback('🎓 Beasiswa', 'career:scholarship')],
      [Markup.button.callback('🗺️ Career Roadmap', 'career:roadmap')],
      [Markup.button.callback('🎤 Interview Prep', 'career:interview')],
      [Markup.button.callback('💻 Remote Jobs', 'career:remote')],
    ]);
    await ctx.reply('💼 *Career Center*\n\nPilih layanan karir:', { parse_mode: 'Markdown', ...keyboard });
  });

  bot.action('career:cv', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '📄 *CV Builder*\n\nKetik: `/buatcv [nama] | [prodi] | [skills] | [pengalaman] | [target pekerjaan]`\n\n' +
      'Contoh:\n`/buatcv Budi Santoso | Teknik Informatika | Python,Web,AI | Magang di startup | Software Engineer`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('buatcv', async (ctx) => {
    const args = ctx.message.text.replace('/buatcv ', '').split('|').map((s) => s.trim());
    if (args.length < 3) return ctx.reply('Format: /buatcv nama | prodi | skills | pengalaman | target');
    const [name, prodi, skills, experience, target] = args;
    const typing = await ctx.reply('📄 Membuat CV Anda...');
    try {
      const prompt = `Buat CV profesional dalam format teks terstruktur untuk:\nNama: ${name}\nProgram Studi: ${prodi}\nSkills: ${skills}\nPengalaman: ${experience || 'Belum ada pengalaman kerja'}\nTarget: ${target || 'Fresh Graduate'}\nUniversitas: UHAMKA\n\nBuat CV yang profesional, ATS-friendly, dengan objective statement yang kuat, dan beri tips singkat di akhir.`;
      const response = await aiRouter.chat([{ role: 'user', content: prompt }], CAREER_PROMPTS.cvBuilder);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, `📄 *CV untuk ${name}*\n\n${response.content}`);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal membuat CV. Coba lagi nanti.');
    }
  });

  bot.action('career:portfolio', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🖼️ *Portfolio Builder*\n\nKetik: `/buatportfolio [bidang] | [3-5 proyek/skill unggulan]`\n\n' +
      'Contoh:\n`/buatportfolio Web Development | E-commerce app, Portfolio website, API REST`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('buatportfolio', async (ctx) => {
    const args = ctx.message.text.replace('/buatportfolio ', '').split('|').map((s) => s.trim());
    if (args.length < 2) return ctx.reply('Format: /buatportfolio [bidang] | [proyek unggulan]');
    const [field, projects] = args;
    const typing = await ctx.reply('🖼️ Menyusun struktur portfolio...');
    try {
      const prompt = `Buat outline portfolio profesional untuk bidang "${field}" dengan proyek unggulan: ${projects}.\nSertakan: struktur halaman yang ideal, cara menampilkan tiap proyek (problem-solution-result), tips visual, dan platform gratis yang cocok (GitHub Pages, Behance, dll) untuk mahasiswa.`;
      const response = await aiRouter.chat([{ role: 'user', content: prompt }], CAREER_PROMPTS.portfolioBuilder);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal membuat portfolio. Coba lagi nanti.');
    }
  });

  bot.action('career:linkedin', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '💼 *LinkedIn Optimizer*\n\nKetik: `/optimizelinkedin [jurusan] | [target karir] | [skill utama]`\n\n' +
      'Contoh:\n`/optimizelinkedin Akuntansi | Financial Analyst | Excel, Audit, Tax`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('optimizelinkedin', async (ctx) => {
    const args = ctx.message.text.replace('/optimizelinkedin ', '').split('|').map((s) => s.trim());
    if (args.length < 2) return ctx.reply('Format: /optimizelinkedin [jurusan] | [target karir] | [skill]');
    const [major, target, skills] = args;
    const typing = await ctx.reply('💼 Mengoptimalkan profil LinkedIn...');
    try {
      const prompt = `Buatkan optimasi profil LinkedIn untuk mahasiswa jurusan ${major} dengan target karir ${target} dan skill utama ${skills || 'umum'}.\nSertakan: contoh headline yang menarik, contoh About/Summary section, 3 tips konten yang harus diposting, dan cara membangun koneksi yang relevan.`;
      const response = await aiRouter.chat([{ role: 'user', content: prompt }], CAREER_PROMPTS.linkedinOptimizer);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal memproses. Coba lagi nanti.');
    }
  });

  bot.action('career:internship', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🔍 *Cari Magang*\n\n' +
      'Platform magang yang direkomendasikan:\n\n' +
      '• *Kampus Merdeka (MSIB)* — magang.kampusmerdeka.kemdikbud.go.id\n' +
      '• *LinkedIn Jobs* — filter "Internship"\n' +
      '• *Glints* — glints.com\n' +
      '• *Jobstreet* — jobstreet.co.id\n' +
      '• *Karir.com*\n\n' +
      'Mau rekomendasi magang sesuai jurusanmu? Ketik:\n`/carimagang [jurusan/bidang]`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('carimagang', async (ctx) => {
    const field = ctx.message.text.replace('/carimagang ', '').trim();
    if (!field) return ctx.reply('Format: /carimagang [jurusan/bidang]\nContoh: /carimagang teknik informatika');
    const typing = await ctx.reply('🔍 Menyiapkan rekomendasi magang...');
    try {
      const prompt = `Berikan saran strategi mencari magang untuk mahasiswa jurusan "${field}". Sertakan: jenis perusahaan/role magang yang relevan, skill yang harus disiapkan, platform pencarian terbaik, dan tips melamar yang efektif.`;
      const response = await aiRouter.chat([{ role: 'user', content: prompt }], CAREER_PROMPTS.internshipAdvisor);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal memproses. Coba lagi nanti.');
    }
  });

  bot.action('career:scholarship', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🎓 *Beasiswa*\n\n*Internal UHAMKA:*\n• Beasiswa Prestasi Akademik\n• Beasiswa Kurang Mampu\n• Beasiswa Tahfidz Al-Qur\'an\n• Beasiswa Aktivis Mahasiswa\n\n' +
      '*Eksternal:*\n• KIP-K (Kartu Indonesia Pintar Kuliah)\n• Beasiswa Bank Indonesia\n• Beasiswa LPDP (S2/S3)\n• Beasiswa Muhammadiyah\n\n' +
      '📞 Info lebih lanjut hubungi Bagian Kemahasiswaan UHAMKA atau cek menu 🏫 UHAMKA → Beasiswa.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('career:roadmap', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🗺️ *Career Roadmap*\n\nKetik: `/roadmap [posisi/karir impian] | [semester saat ini]`\n\n' +
      'Contoh:\n`/roadmap Data Scientist | 4`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('roadmap', async (ctx) => {
    const args = ctx.message.text.replace('/roadmap ', '').split('|').map((s) => s.trim());
    if (args.length < 1 || !args[0]) return ctx.reply('Format: /roadmap [karir impian] | [semester saat ini]');
    const [career, semester] = args;
    const typing = await ctx.reply('🗺️ Menyusun roadmap karir...');
    try {
      const prompt = `Buat roadmap karir tahap demi tahap untuk mahasiswa semester ${semester || 'awal'} yang ingin menjadi "${career}". Bagi menjadi tahapan per semester/tahun sampai lulus, sertakan: skill yang harus dikuasai tiap tahap, sertifikasi yang berguna, proyek yang harus dibuat, dan organisasi/komunitas yang relevan untuk diikuti.`;
      const response = await aiRouter.chat([{ role: 'user', content: prompt }], CAREER_PROMPTS.careerRoadmap);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal membuat roadmap. Coba lagi nanti.');
    }
  });

  bot.action('career:remote', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '💻 *Remote Jobs & Freelance*\n\n' +
      '*Platform Freelance:*\n• Upwork, Fiverr — internasional\n• Sribulancer, Projects.co.id — lokal\n\n' +
      '*Remote Job Boards:*\n• remoteok.com\n• weworkremotely.com\n• LinkedIn (filter Remote)\n\n' +
      'Tips: mulai dari profil yang kuat, portofolio yang relevan, dan ambil proyek kecil dulu untuk membangun rating.\n\n' +
      'Mau strategi spesifik sesuai skill-mu? Ketik:\n`/remotejob [skill/bidang]`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('remotejob', async (ctx) => {
    const skill = ctx.message.text.replace('/remotejob ', '').trim();
    if (!skill) return ctx.reply('Format: /remotejob [skill/bidang]\nContoh: /remotejob desain grafis');
    const typing = await ctx.reply('💻 Menyiapkan strategi remote job...');
    try {
      const prompt = `Berikan strategi mencari kerja remote/freelance untuk skill "${skill}" bagi mahasiswa Indonesia. Sertakan platform terbaik, cara membuat profil yang menarik klien, dan estimasi rate untuk pemula.`;
      const response = await aiRouter.chat([{ role: 'user', content: prompt }], CAREER_PROMPTS.remoteWorkAdvisor);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal memproses. Coba lagi nanti.');
    }
  });

  bot.action('career:interview', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🎤 *Interview Preparation*\n\nKetik: `/interview [posisi yang dilamar]`\n\nContoh: `/interview Software Engineer Intern`', { parse_mode: 'Markdown' });
  });

  bot.command('interview', async (ctx) => {
    const position = ctx.message.text.replace('/interview ', '').trim();
    if (!position) return ctx.reply('Format: /interview [posisi]\nContoh: /interview Data Analyst');
    const typing = await ctx.reply('🎤 Menyiapkan pertanyaan interview...');
    try {
      const response = await aiRouter.chat(
        [{ role: 'user', content: `Buat 10 pertanyaan interview umum dan teknis untuk posisi ${position}, beserta tips menjawabnya. Sertakan juga contoh jawaban STAR method.` }],
        CAREER_PROMPTS.interviewCoach
      );
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await smartReply(ctx, response.content);
    } catch {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typing.message_id); } catch {}
      await ctx.reply('❌ Gagal menyiapkan pertanyaan. Coba lagi.');
    }
  });
};
