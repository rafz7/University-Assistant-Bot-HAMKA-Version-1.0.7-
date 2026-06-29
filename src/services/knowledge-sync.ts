import axios from 'axios';
import { prisma } from '../database';
import { knowledgeLogger } from '../utils/logger';

interface ScrapedDocument {
  title: string;
  content: string;
  source: string;
  category: string;
  url?: string;
}

export class KnowledgeSyncService {
  private readonly sources = [
    { url: 'https://uhamka.ac.id', category: 'PROFILE', name: 'Website UHAMKA' },
    { url: 'https://akademik.uhamka.ac.id', category: 'ACADEMIC', name: 'Akademik UHAMKA' },
  ];

  async syncAll(): Promise<void> {
    knowledgeLogger.info('Starting knowledge sync...');
    let synced = 0;
    for (const source of this.sources) {
      try {
        await this.syncSource(source);
        synced++;
      } catch (err: any) {
        knowledgeLogger.warn(`Failed to sync ${source.name}: ${err.message}`);
      }
    }
    knowledgeLogger.info(`Knowledge sync complete. ${synced}/${this.sources.length} sources synced.`);
  }

  private async syncSource(source: { url: string; category: string; name: string }): Promise<void> {
    knowledgeLogger.debug(`Syncing: ${source.name}`);
    // In production: implement real web scraping with cheerio/puppeteer
    // For now, log the attempt
    knowledgeLogger.info(`Source ${source.name} sync queued (implement scraper as needed)`);
  }

  async addDocument(doc: ScrapedDocument): Promise<void> {
    const vectorId = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await prisma.knowledgeDocument.create({
      data: { ...doc, vectorId, isActive: true },
    });
    knowledgeLogger.info(`Document added: ${doc.title}`);
  }

  async searchDocuments(query: string, category?: string, limit = 5) {
    return prisma.knowledgeDocument.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getStats() {
    const [total, byCategory] = await Promise.all([
      prisma.knowledgeDocument.count({ where: { isActive: true } }),
      prisma.knowledgeDocument.groupBy({ by: ['category'], _count: true, where: { isActive: true } }),
    ]);
    return { total, byCategory };
  }
}

export const knowledgeSyncService = new KnowledgeSyncService();
