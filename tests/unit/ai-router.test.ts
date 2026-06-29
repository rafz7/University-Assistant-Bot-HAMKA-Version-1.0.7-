import { AIRouter } from '../../src/services/providers/ai-router';

describe('AIRouter', () => {
  let router: AIRouter;

  beforeEach(() => {
    router = new AIRouter();
  });

  test('should initialize with no providers when no API keys set', () => {
    expect(router.getHealthyCount()).toBe(0);
  });

  test('should return provider stats array', () => {
    const stats = router.getStats();
    expect(Array.isArray(stats)).toBe(true);
  });
});
