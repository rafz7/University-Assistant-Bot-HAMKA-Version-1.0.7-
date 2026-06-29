import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const configs = [
    { key: 'BOT_VERSION', value: '1.0.0', description: 'Current bot version' },
    { key: 'MAINTENANCE_MODE', value: 'false', description: 'Maintenance mode flag' },
  ];
  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key }, update: { value: cfg.value }, create: cfg,
    });
  }

  const knowledgeDocs = [
    {
      title: 'Profil UHAMKA',
      content: 'Universitas Muhammadiyah Prof. DR. HAMKA (UHAMKA) adalah perguruan tinggi swasta yang didirikan Persyarikatan Muhammadiyah, berlokasi di Jakarta. Visi: menjadi universitas utama berlandaskan nilai keislaman dan kemuhammadiyahan.',
      source: 'uhamka.ac.id', category: 'PROFILE',
      vectorId: 'seed-profil-uhamka',
    },
    {
      title: 'Kalender Akademik UHAMKA',
      content: 'Semester Ganjil: Agustus–Januari. Semester Genap: Februari–Juli. UTS dan UAS mengikuti kalender masing-masing fakultas. Libur Nasional dan Hari Besar Islam ditetapkan dalam kalender akademik tahunan.',
      source: 'akademik.uhamka.ac.id', category: 'ACADEMIC',
      vectorId: 'seed-kalender-akademik',
    },
    {
      title: 'Beasiswa di UHAMKA',
      content: 'UHAMKA menyediakan beasiswa KIP-K, Beasiswa Prestasi, Beasiswa Tahfidz, Beasiswa Kurang Mampu, dan Beasiswa Muhammadiyah. Informasi lengkap di bagian Kemahasiswaan.',
      source: 'kemahasiswaan.uhamka.ac.id', category: 'SCHOLARSHIP',
      vectorId: 'seed-beasiswa-uhamka',
    },
    {
      title: 'Prosedur KRS UHAMKA',
      content: 'KRS diambil secara online di portal akademik UHAMKA. Syarat: lunas SPP, tidak ada nilai F tertahan, dan sudah konsultasi dosen wali. Jadwal KRS diumumkan setiap semester.',
      source: 'akademik.uhamka.ac.id', category: 'ACADEMIC',
      vectorId: 'seed-prosedur-krs',
    },
    {
      title: 'Organisasi Mahasiswa UHAMKA',
      content: 'Organisasi mahasiswa UHAMKA: BEM Universitas, DPM, IMM (Ikatan Mahasiswa Muhammadiyah), Tapak Suci, HizbulWathan, dan berbagai UKM olahraga, seni, dan keilmuan.',
      source: 'kemahasiswaan.uhamka.ac.id', category: 'ORGANIZATION',
      vectorId: 'seed-organisasi-mahasiswa',
    },
    {
      title: 'Fakutas di UHAMKA',
      content: 'UHAMKA memiliki fakultas: FIKES (Kesehatan), FT (Teknik), FKIP (Keguruan), FEB (Ekonomi & Bisnis), FISIP (Ilmu Sosial), FAI (Agama Islam), FH (Hukum), dan Sekolah Pascasarjana.',
      source: 'uhamka.ac.id', category: 'FACULTY',
      vectorId: 'seed-fakultas-uhamka',
    },
  ];

  for (const doc of knowledgeDocs) {
    await prisma.knowledgeDocument.upsert({
      where: { vectorId: doc.vectorId },
      update: {},
      create: doc,
    });
  }

  console.log('✅ Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
