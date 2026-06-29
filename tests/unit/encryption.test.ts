// Mock config to avoid real env vars in tests
jest.mock('../../src/config', () => ({
  config: {
    encryption: { key: 'test-key-exactly-32-characters!!' },
    jwt: { secret: 'test-jwt-secret-at-least-32-characters-long', expiresIn: '7d' },
    logging: { level: 'error', dir: './logs' },
    env: 'test',
    isProduction: false,
    telegram: { token: 'test', mode: 'polling', ownerTelegramId: BigInt(0), ownerUsername: 'test', webhookPort: 8443 },
    redis: { host: 'localhost', port: 6379, db: 0 },
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    upload: { maxFileSizeMb: 20, allowedTypes: ['pdf'] },
    prayer: { apiUrl: '', defaultCity: 'Jakarta', defaultCountry: 'Indonesia' },
    quran: { apiUrl: '' },
    ai: { geminiKeys: [], groqKeys: [], geminiModel: '', groqModel: '', timeoutMs: 30000, maxRetries: 3 },
    vector: { qdrantUrl: '', collection: 'test' },
    port: 3000,
    database: { url: '', sqliteUrl: '' },
  },
}));

import { encrypt, decrypt } from '../../src/utils/encryption';

describe('Encryption Utils', () => {
  test('encrypt and decrypt roundtrip', () => {
    const original = 'Hello UHAMKA 2024!';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test('two encryptions of same text differ (random IV)', () => {
    const text = 'same text';
    expect(encrypt(text)).not.toBe(encrypt(text));
  });
});
