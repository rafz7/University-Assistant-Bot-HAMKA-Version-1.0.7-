import { Context } from 'telegraf';

const TELEGRAM_MAX_LEN = 4096;
const SAFE_CHUNK_LEN = 3900; // margin below Telegram's hard 4096 cap

/**
 * Splits a long text into Telegram-safe chunks, trying hard not to break in
 * the middle of a ``` fenced code block. If a split does land inside a code
 * block, the fence is closed at the end of that chunk and re-opened (with
 * the same language tag) at the start of the next chunk, so each message is
 * still individually valid, monospaced Markdown.
 */
function splitPreservingCodeBlocks(text: string, maxLen = SAFE_CHUNK_LEN): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('\n\n', maxLen);
    if (cut < maxLen * 0.5) cut = remaining.lastIndexOf('\n', maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;

    let chunk = remaining.slice(0, cut);
    const fenceCount = (chunk.match(/```/g) || []).length;
    let openLang = '';

    if (fenceCount % 2 === 1) {
      // We're cutting inside an open code fence — find its language tag
      const lastFenceIdx = chunk.lastIndexOf('```');
      const afterFence = chunk.slice(lastFenceIdx + 3);
      openLang = afterFence.split('\n')[0].trim();
      chunk += '\n```'; // close it for this chunk
    }

    chunks.push(chunk);
    remaining = (fenceCount % 2 === 1 ? '```' + openLang + '\n' : '') + remaining.slice(cut);
  }

  if (remaining.trim().length > 0) chunks.push(remaining);
  return chunks;
}

/**
 * Sends a (possibly long) piece of AI/markdown content to a Telegram chat.
 * - Splits messages over Telegram's 4096-char limit into multiple sends,
 *   keeping code blocks intact across the split.
 * - Tries Markdown parse_mode first (for nice bold/code formatting); if
 *   Telegram rejects it (unbalanced *,_,` from AI-generated text — very
 *   common with code containing underscores/asterisks), silently retries
 *   that chunk as plain text instead of failing to deliver anything.
 */
export async function smartReply(ctx: Context, text: string): Promise<void> {
  const trimmed = text?.trim() || '(tidak ada balasan)';
  const chunks = splitPreservingCodeBlocks(trimmed);

  for (const chunk of chunks) {
    try {
      await ctx.reply(chunk, { parse_mode: 'Markdown' });
    } catch {
      try {
        await ctx.reply(chunk);
      } catch {
        // Last resort: strip markdown-ish symbols that might confuse re-send
        await ctx.reply(chunk.replace(/[*_`]/g, '')).catch(() => undefined);
      }
    }
    if (chunks.length > 1) await new Promise((r) => setTimeout(r, 250)); // gentle pacing
  }
}

/** Same as smartReply but also deletes a "typing..." placeholder message first. */
export async function smartReplyAfter(
  ctx: Context,
  placeholderMessageId: number | undefined,
  text: string
): Promise<void> {
  if (placeholderMessageId && ctx.chat) {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, placeholderMessageId);
    } catch {}
  }
  await smartReply(ctx, text);
}
