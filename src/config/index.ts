import dotenv from 'dotenv';
dotenv.config({ override: true });

export const config = {
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT || '3000'),
  isProduction: process.env.NODE_ENV === 'production',
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    mode: (process.env.TELEGRAM_BOT_MODE || 'polling') as 'polling' | 'webhook' | 'auto',
    webhookUrl: process.env.WEBHOOK_URL || '',
    webhookPort: parseInt(process.env.WEBHOOK_PORT || '8443'),
    ownerTelegramId: process.env.OWNER_TELEGRAM_ID || '0',
    ownerUsername: (process.env.OWNER_USERNAME || 'ravzxz').replace(/^@/, ''),
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./data/uhamka.db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  encryption: {
    key: (process.env.ENCRYPTION_KEY || 'fallback-key-change-this-now!!').padEnd(32).slice(0, 32),
  },
  ai: {
    geminiKeys: [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter(Boolean) as string[],
    groqKeys: [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
    ].filter(Boolean) as string[],
    geminiModels: (process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-2.5-flash-lite')
      .split(',').map((s) => s.trim()).filter(Boolean),
    groqModels: (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile,llama-3.1-8b-instant')
      .split(',').map((s) => s.trim()).filter(Boolean),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000'),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
  },
  vector: {
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    qdrantApiKey: process.env.QDRANT_API_KEY,
    collection: process.env.VECTOR_COLLECTION || 'uhamka_knowledge',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },
  prayer: {
    apiUrl: process.env.PRAYER_API_URL || 'https://api.aladhan.com/v1',
    defaultCity: process.env.DEFAULT_CITY || 'Jakarta',
    defaultCountry: process.env.DEFAULT_COUNTRY || 'Indonesia',
  },
  quran: {
    apiUrl: process.env.QURAN_API_URL || 'https://api.quran.com/api/v4',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30'),
  },
  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '20'),
    allowedTypes: ['pdf', 'docx', 'txt', 'pptx', 'csv', 'xlsx'],
  },
};

// Validate critical config
if (!config.telegram.token) {
  console.error('❌ TELEGRAM_BOT_TOKEN tidak diisi di .env!');
  process.exit(1);
}
