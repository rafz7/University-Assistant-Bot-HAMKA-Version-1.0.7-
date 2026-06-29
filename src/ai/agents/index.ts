import { aiRouter, AIMessage } from '../../services/providers/ai-router';
import { memoryManager } from '../memory';
import { AgentType, AGENT_PROMPTS } from '../../config/prompts';

export type { AgentType };

export class AgentManager {
  async run(
    userId: string,
    userMessage: string,
    agentType: AgentType = 'general',
    useMemory = true
  ): Promise<string> {
    const systemPrompt = AGENT_PROMPTS[agentType];
    let messages: AIMessage[] = [];

    if (useMemory) {
      messages = await memoryManager.getMemory(userId, agentType);
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await aiRouter.chat(messages, systemPrompt);
    const assistantMessage: AIMessage = { role: 'assistant', content: response.content };

    if (useMemory) {
      await memoryManager.addMessage(userId, { role: 'user', content: userMessage }, agentType);
      await memoryManager.addMessage(userId, assistantMessage, agentType);
    }

    return response.content;
  }

  async clearAgentMemory(userId: string, agentType: AgentType): Promise<void> {
    await memoryManager.clearMemory(userId, agentType);
  }
}

export const agentManager = new AgentManager();
