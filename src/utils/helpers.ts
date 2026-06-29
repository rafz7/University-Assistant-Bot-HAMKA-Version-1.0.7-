export const truncate = (str: string, maxLen = 4096): string =>
  str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const formatDate = (date: Date, locale = 'id-ID'): string =>
  date.toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

export const formatTime = (date: Date): string =>
  date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export const gradeToPoint = (grade: string): number => {
  const map: Record<string, number> = {
    A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7,
    'C+': 2.3, C: 2.0, 'C-': 1.7, D: 1.0, E: 0.0,
  };
  return map[grade.toUpperCase()] ?? 0;
};

export const calcIPK = (transcripts: { gradePoint: number; credits: number }[]): number => {
  const totalCredits = transcripts.reduce((s, t) => s + t.credits, 0);
  const totalPoints = transcripts.reduce((s, t) => s + t.gradePoint * t.credits, 0);
  return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
};

export const getPriorityEmoji = (priority: string): string => ({
  URGENT: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢',
}[priority] || '⚪');

export const chunkArray = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

export const escapeMarkdown = (text: string): string =>
  text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
