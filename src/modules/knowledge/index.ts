import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../bot/middlewares';
import { aiRouter } from '../../services/providers/ai-router';
import { prisma } from '../../database';
import { knowledgeLogger } from '../../utils/logger';
import { UHAMKA_KNOWLEDGE_SYSTEM_PROMPT } from '../../config/prompts';
import { smartReply, smartReplyAfter } from '../../utils/telegram-reply';

export const registerKnowledgeModule = (bot: Telegraf<BotContext>): void => {
  bot.hears('🏫 UHAMKA', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🏛️ Fakultas & Prodi', 'uhamka:faculty')],
      [Markup.button.callback('📅 Kalender Akademik', 'uhamka:calendar')],
      [Markup.button.callback('👨‍🏫 Direktori Dosen', 'uhamka:lecturers')],
      [Markup.button.callback('🎓 Beasiswa', 'uhamka:scholarship')],
      [Markup.button.callback('📢 Pengumuman', 'uhamka:announcement')],
      [Markup.button.callback('🏢 Organisasi Mahasiswa', 'uhamka:organization')],
      [Markup.button.callback('📚 Repository', 'uhamka:repository')],
      [Markup.button.callback('📖 Panduan Akademik', 'uhamka:guide')],
      [Markup.button.callback('❓ FAQ', 'uhamka:faq')],
      [Markup.button.callback('🔍 Cari Info UHAMKA', 'uhamka:search')],
    ]);
    await ctx.reply('🏫 *Informasi UHAMKA*\n\nPilih kategori informasi:', { parse_mode: 'Markdown', ...keyboard });
  });

  bot.action('uhamka:faculty', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `*Fakultas di UHAMKA:*\n\n` +
      `1. 🏥 *Fakultas Ilmu-Ilmu Kesehatan (FIKES)*\n   Kesmas, Gizi, Farmasi, Keperawatan\n\n` +
      `2. 🏗️ *Fakultas Teknologi Industri dan Informatika (FTII)*\n   Teknik Informatika, Sistem & Teknologi Informasi, Teknik Industri\n\n` +
      `3. 📚 *Fakultas Keguruan dan Ilmu Pendidikan (FKIP)*\n   Pend. Matematika, Pend. Biologi, Pend. Bahasa Indonesia, dll\n\n` +
      `4. 💼 *Fakultas Ekonomi dan Bisnis (FEB)*\n   Manajemen, Akuntansi, Ekonomi Pembangunan\n\n` +
      `5. 🏛️ *Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)*\n   Ilmu Komunikasi, Administrasi Publik\n\n` +
      `6. 🕌 *Fakultas Agama Islam (FAI)*\n\n` +
      `7. ⚖️ *Fakultas Hukum (FH)*\n\n` +
      `8. 🎓 *Sekolah Pascasarjana*\n   Magister & Doktoral\n\n` +
      `🌐 Info lengkap & terkini: uhamka.ac.id`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:calendar', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `📅 *Kalender Akademik UHAMKA*\n\n` +
      `*Semester Ganjil:* Agustus – Januari\n*Semester Genap:* Februari – Juli\n\n` +
      `Tahapan umum tiap semester:\n` +
      `• Pengisian KRS online\n• Masa perkuliahan\n• UTS (pertengahan semester)\n• UAS (akhir semester)\n• Yudisium & wisuda (bagi yang lulus)\n\n` +
      `📌 *Tanggal pasti* berbeda tiap tahun akademik & bisa beda per fakultas — unduh SK Kalender Akademik resmi (PDF) di:\n` +
      `🔗 ft.uhamka.ac.id/kalender-akd (Fakultas Teknologi Industri dan Informatika)\n` +
      `🔗 akademik.uhamka.ac.id (kalender universitas)\n\n` +
      `_Fakultas lain biasanya punya halaman kalender serupa — cek website fakultasmu jika di luar FTII._\n\n` +
      `📚 Sudah masuk masa kuliah? Cek jadwal harianmu dengan /jadwal, atau atur lewat 🎓 Akademik.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:lecturers', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `👨‍🏫 *Direktori Dosen UHAMKA*\n\n` +
      `Direktori dosen resmi (nama, NIDN, bidang keahlian, publikasi) tersedia di laman fakultas masing-masing, contoh:\n\n` +
      `• ft.uhamka.ac.id/dosen-teknik-mesin\n• fikes.uhamka.ac.id\n• fkip.uhamka.ac.id\n\n` +
      `Atau cari publikasi dosen via Google Scholar / SINTA Kemdikbud dengan nama dosen yang dicari.\n\n` +
      `💡 Saya tidak menyimpan data dosen secara manual — silakan cek langsung ke situs fakultas untuk info terkini & akurat.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:scholarship', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `🎓 *Beasiswa di UHAMKA*\n\n*Internal:*\n• Beasiswa Prestasi Akademik\n• Beasiswa Kurang Mampu\n• Beasiswa Tahfidz Al-Qur'an\n• Beasiswa Aktivis Mahasiswa\n\n` +
      `*Eksternal:*\n• KIP-K (Kartu Indonesia Pintar Kuliah)\n• Beasiswa Bank Indonesia\n• Beasiswa LPDP\n• Beasiswa Muhammadiyah\n\n` +
      `📋 *Syarat Umum:* IPK minimal sesuai ketentuan, aktif sebagai mahasiswa, dokumen pendukung lengkap.\n\n📞 Info lebih lanjut: Bagian Kemahasiswaan UHAMKA`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:announcement', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `📢 *Pengumuman Kampus*\n\n` +
      `Pengumuman resmi & terkini (jadwal KRS, wisuda, libur, dll) dipublikasikan di:\n\n` +
      `🌐 uhamka.ac.id (halaman utama & berita)\n📱 Akun media sosial resmi UHAMKA\n📋 Papan pengumuman tiap fakultas\n\n` +
      `💡 Saya belum bisa menampilkan pengumuman real-time, tapi kamu bisa tanya saya hal spesifik dan saya bantu carikan arahnya lewat /cari.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:organization', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `🏢 *Organisasi Mahasiswa UHAMKA*\n\n` +
      `• *BEM* — Badan Eksekutif Mahasiswa (tingkat universitas & fakultas)\n` +
      `• *DPM* — Dewan Perwakilan Mahasiswa\n` +
      `• *IMM* — Ikatan Mahasiswa Muhammadiyah\n` +
      `• *Tapak Suci* — perguruan pencak silat Muhammadiyah\n` +
      `• *Hizbul Wathan* — kepanduan Muhammadiyah\n` +
      `• *UKM* — Unit Kegiatan Mahasiswa (olahraga, seni, keilmuan, jurnalistik, dll)\n\n` +
      `Tertarik bergabung? Hubungi BEM fakultasmu atau cek info pendaftaran anggota baru tiap awal semester.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:repository', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `📚 *Repository UHAMKA*\n\nAkses skripsi, tesis, jurnal, dan penelitian publik UHAMKA:\n\n` +
      `🔗 repository.uhamka.ac.id\n🔗 journal.uhamka.ac.id\n\n` +
      `Atau gunakan command bot ini langsung:\n` +
      `• \`/cariskripsi [topik]\`\n• \`/carijurnal [topik]\`\n• \`/caripenelitian [topik]\``,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:guide', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `📖 *Panduan Akademik*\n\n` +
      `*Hal umum yang diatur dalam Panduan Akademik UHAMKA:*\n` +
      `• Prosedur pengisian KRS\n• Sistem SKS & beban studi per semester\n• Syarat kelulusan (min. 144 SKS untuk S1)\n` +
      `• IPK minimal 2.00 untuk yudisium\n• Tata cara cuti akademik\n• Tata cara pengajuan skripsi\n\n` +
      `📋 Panduan akademik lengkap & resmi tersedia di portal akademik fakultas masing-masing atau akademik.uhamka.ac.id`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:faq', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `❓ *FAQ UHAMKA*\n\n` +
      `*Q: Berapa SKS minimal untuk lulus?*\nA: Minimal 144 SKS untuk S1\n\n` +
      `*Q: Berapa IPK minimal untuk yudisium?*\nA: IPK minimal 2.00\n\n` +
      `*Q: Bagaimana cara mengambil KRS?*\nA: Melalui portal akademik online UHAMKA\n\n` +
      `*Q: Kapan jadwal UTS dan UAS?*\nA: Sesuai kalender akademik tiap semester\n\n` +
      `*Q: Dimana mengurus surat keterangan aktif?*\nA: Bagian Akademik Fakultas masing-masing\n\n` +
      `🔍 Punya pertanyaan lain? Ketik /ai atau tanya langsung!`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('uhamka:search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🔍 *Cari Informasi UHAMKA*\n\nKetik: `/cari [pertanyaan]`\n\nContoh: `/cari jadwal pendaftaran`", { parse_mode: 'Markdown' });
  });

  bot.command('cari', async (ctx) => {
    const query = ctx.message.text.replace('/cari ', '').trim();
    if (!query) return ctx.reply('Format: /cari [pertanyaan]\nContoh: /cari jadwal pendaftaran');

    const typingMsg = await ctx.reply('🔍 Mencari informasi...');
    try {
      const knowledgeDocs = await prisma.knowledgeDocument.findMany({
        where: { OR: [{ title: { contains: query } }, { content: { contains: query } }], isActive: true },
        take: 3,
      });

      let context = '';
      if (knowledgeDocs.length > 0) {
        context = '\n\nKonteks dari Knowledge Base UHAMKA:\n';
        knowledgeDocs.forEach((doc) => {
          context += `\n[${doc.title}]: ${doc.content.substring(0, 300)}...\nSumber: ${doc.source}\n`;
        });
      }

      const response = await aiRouter.chat([{ role: 'user', content: query + context }], UHAMKA_KNOWLEDGE_SYSTEM_PROMPT);
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typingMsg.message_id); } catch {}

      let replyText = `🔍 *Hasil Pencarian: "${query}"*\n\n${response.content}`;
      if (knowledgeDocs.length > 0) replyText += `\n\n📚 *Sumber:* ${knowledgeDocs.map((d) => d.source).join(', ')}`;
      await smartReply(ctx, replyText);
    } catch (error) {
      knowledgeLogger.error('Knowledge search error', { error });
      try { await ctx.telegram.deleteMessage(ctx.chat.id, typingMsg.message_id); } catch {}
      await ctx.reply('❌ Gagal mencari informasi. Coba lagi nanti.');
    }
  });
};
