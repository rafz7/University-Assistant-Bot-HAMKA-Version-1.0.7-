describe('Config validation', () => {
  test('required environment variables are documented in .env.example', () => {
    const fs = require('fs');
    const envExample = fs.readFileSync('.env.example', 'utf-8');
    expect(envExample).toContain('TELEGRAM_BOT_TOKEN');
    expect(envExample).toContain('DATABASE_URL');
    expect(envExample).toContain('REDIS_HOST');
    expect(envExample).toContain('JWT_SECRET');
  });
});
