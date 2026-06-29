import { prisma } from '../../database';
import { cache } from '../../services/redis';
import { AIMessage } from '../../services/providers/ai-router';

export class MemoryManager {
  private readonly maxMessages = 20;
  private readonly cachePrefix = 'conv:';
  private readonly cacheTtl = 3600;

  async getMemory(userId: string, agent = 'general'): Promise<AIMessage[]> {
    const cacheKey = `${this.cachePrefix}${userId}:${agent}`;
    const cached = await cache.get<AIMessage[]>(cacheKey);
    if (cached) return cached;

    const conv = await prisma.conversation.findFirst({
      where: { userId, agent },
      orderBy: { updatedAt: 'desc' },
    });

    const messages: AIMessage[] = conv ? JSON.parse(conv.messages as string) : [];
    await cache.set(cacheKey, messages, this.cacheTtl);
    return messages;
  }

  async addMessage(userId: string, message: AIMessage, agent = 'general'): Promise<void> {
    let messages = await this.getMemory(userId, agent);
    messages.push(message);
    if (messages.length > this.maxMessages) {
      messages = messages.slice(-this.maxMessages);
    }
    const messagesStr = JSON.stringify(messages);
    const convId = `${userId}-${agent}`;

    await prisma.conversation.upsert({
      where: { id: convId },
      update: { messages: messagesStr, updatedAt: new Date() },
      create: { id: convId, userId, agent, messages: messagesStr },
    });

    const cacheKey = `${this.cachePrefix}${userId}:${agent}`;
    await cache.set(cacheKey, messages, this.cacheTtl);
  }

  async clearMemory(userId: string, agent = 'general'): Promise<void> {
    await prisma.conversation.deleteMany({ where: { userId, agent } });
    await cache.del(`${this.cachePrefix}${userId}:${agent}`);
  }
}

export const memoryManager = new MemoryManager();
