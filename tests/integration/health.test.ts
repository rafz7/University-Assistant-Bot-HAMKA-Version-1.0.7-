import axios from 'axios';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

describe('Health Check Integration', () => {
  test('GET /health returns 200', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
    expect(res.data.uptime).toBeGreaterThan(0);
  }, 10000);
});
