import { truncate, calcIPK, gradeToPoint, chunkArray } from '../../src/utils/helpers';

describe('Helper Utilities', () => {
  test('truncate returns string as-is if short enough', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  test('truncate adds ellipsis when over limit', () => {
    const result = truncate('a'.repeat(100), 50);
    expect(result.length).toBe(50);
    expect(result.endsWith('...')).toBe(true);
  });

  test('gradeToPoint maps A to 4.0', () => {
    expect(gradeToPoint('A')).toBe(4.0);
    expect(gradeToPoint('B')).toBe(3.0);
    expect(gradeToPoint('E')).toBe(0.0);
  });

  test('calcIPK calculates correctly', () => {
    const transcripts = [
      { gradePoint: 4.0, credits: 3 },
      { gradePoint: 3.0, credits: 3 },
    ];
    expect(calcIPK(transcripts)).toBe(3.5);
  });

  test('calcIPK returns 0 for empty array', () => {
    expect(calcIPK([])).toBe(0);
  });

  test('chunkArray splits correctly', () => {
    const arr = [1,2,3,4,5];
    const chunks = chunkArray(arr, 2);
    expect(chunks).toEqual([[1,2],[3,4],[5]]);
  });
});
