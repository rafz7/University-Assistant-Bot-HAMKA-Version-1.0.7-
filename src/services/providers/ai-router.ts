import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { config } from '../../config';
import { aiLogger } from '../../utils/logger';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokens?: number;
}

interface ProviderStats {
  name: string;
  requests: number;
  failures: number;
  lastFailure?: Date;
  avgResponseTime: number;
  isHealthy: boolean;
}

type AIProvider = {
  name: string;
  type: 'gemini' | 'groq';
  apiKey: string;
  models: string[]; // ordered fallback list — tried in sequence on this same key
  stats: ProviderStats;
};

// Conservative character budget for the WHOLE messages array sent in a single
// request. Groq's free tier caps llama-3.3-70b-versatile at 12,000 tokens per
// minute; ~3 chars/token is a safe (over-)estimate for mixed ID/EN text, so a
// ~15,000 char budget keeps every request comfortably under that ceiling even
// after accounting for the system prompt and leaving headroom for the reply.
const MAX_HISTORY_CHARS = 15000;

function trimToCharBudget(messages: AIMessage[], maxChars: number): AIMessage[] {
  // Always keep the most recent message (the user's current question) even
  // if it alone is large — we only ever drop OLDER history, never the latest
  // turn, and we hard-cap any single message so one giant paste can't blow
  // the whole budget by itself.
  const HARD_CAP_PER_MESSAGE = 6000;
  const capped = messages.map((m) => ({
    ...m,
    content:
      m.content.length > HARD_CAP_PER_MESSAGE
        ? m.content.slice(0, HARD_CAP_PER_MESSAGE) + '\n…(dipotong, terlalu panjang)'
        : m.content,
  }));

  let total = capped.reduce((sum, m) => sum + m.content.length, 0);
  let start = 0;
  while (total > maxChars && start < capped.length - 1) {
    total -= capped[start].content.length;
    start++;
  }
  return capped.slice(start);
}

export class AIRouter {
  private providers: AIProvider[] = [];

  constructor() {
    this.initProviders();
  }

  private initProviders(): void {
    config.ai.geminiKeys.forEach((key, i) => {
      this.providers.push({
        name: `gemini-${i + 1}`,
        type: 'gemini',
        apiKey: key,
        models: config.ai.geminiModels,
        stats: { name: `gemini-${i + 1}`, requests: 0, failures: 0, avgResponseTime: 0, isHealthy: true },
      });
    });

    config.ai.groqKeys.forEach((key, i) => {
      this.providers.push({
        name: `groq-${i + 1}`,
        type: 'groq',
        apiKey: key,
        models: config.ai.groqModels,
        stats: { name: `groq-${i + 1}`, requests: 0, failures: 0, avgResponseTime: 0, isHealthy: true },
      });
    });

    if (this.providers.length === 0) {
      aiLogger.warn('No AI providers configured! Bot will have limited functionality.');
    } else {
      const totalCombos = this.providers.reduce((sum, p) => sum + p.models.length, 0);
      aiLogger.info(`AI Router initialized: ${this.providers.length} keys × models = ${totalCombos} fallback combinations`);
    }
  }

  async chat(
    messages: AIMessage[],
    systemPrompt?: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<AIResponse> {
    const safeMessages = trimToCharBudget(messages, MAX_HISTORY_CHARS);

    const healthyProviders = this.providers.filter((p) => p.stats.isHealthy);
    if (healthyProviders.length === 0) {
      this.providers.forEach((p) => (p.stats.isHealthy = true));
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      if (!provider.stats.isHealthy) continue;

      for (const model of provider.models) {
        try {
          const startTime = Date.now();
          provider.stats.requests++;

          let response: AIResponse;
          if (provider.type === 'gemini') {
            response = await this.callGemini(provider, model, safeMessages, systemPrompt, options);
          } else {
            response = await this.callGroq(provider, model, safeMessages, systemPrompt, options);
          }

          const elapsed = Date.now() - startTime;
          provider.stats.avgResponseTime =
            (provider.stats.avgResponseTime * (provider.stats.requests - 1) + elapsed) / provider.stats.requests;

          aiLogger.debug(`AI response from ${provider.name}/${model} in ${elapsed}ms`);
          return response;
        } catch (error: any) {
          lastError = error;
          aiLogger.warn(`Provider ${provider.name}/${model} failed: ${error.message?.slice(0, 200)}`);
          // Try the next MODEL on this same key before giving up on the key entirely.
        }
      }

      // All models for this key failed — count as one failure for the key/provider.
      provider.stats.failures++;
      provider.stats.lastFailure = new Date();
      if (provider.stats.failures >= 3) {
        provider.stats.isHealthy = false;
        setTimeout(() => {
          provider.stats.isHealthy = true;
          provider.stats.failures = 0;
        }, 5 * 60 * 1000);
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  private async callGemini(
    provider: AIProvider,
    model: string,
    messages: AIMessage[],
    systemPrompt?: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<AIResponse> {
    const genAI = new GoogleGenerativeAI(provider.apiKey);
    const genModel = genAI.getGenerativeModel({ model, systemInstruction: systemPrompt });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = genModel.startChat({ history });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), config.ai.timeoutMs)
    );

    const responsePromise = chat.sendMessage(lastMessage.content);
    const result = await Promise.race([responsePromise, timeoutPromise]);
    const text = result.response.text();

    return { content: text, provider: provider.name, model };
  }

  private async callGroq(
    provider: AIProvider,
    model: string,
    messages: AIMessage[],
    systemPrompt?: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<AIResponse> {
    const groq = new Groq({ apiKey: provider.apiKey });

    const allMessages: Groq.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
    messages.forEach((m) => {
      allMessages.push({ role: m.role as 'user' | 'assistant' | 'system', content: m.content });
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Groq timeout')), config.ai.timeoutMs)
    );

    const responsePromise = groq.chat.completions.create({
      model,
      messages: allMessages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
    });

    const completion = await Promise.race([responsePromise, timeoutPromise]);
    const content = completion.choices[0]?.message?.content || '';

    return { content, provider: provider.name, model, tokens: completion.usage?.total_tokens };
  }

  getStats(): ProviderStats[] {
    return this.providers.map((p) => p.stats);
  }

  getHealthyCount(): number {
    return this.providers.filter((p) => p.stats.isHealthy).length;
  }
}

export const aiRouter = new AIRouter();
