/**
 * Re-derives `AgentSession.getContextUsage()` from persisted session data so the
 * cold read path (`getThread` on a thread with no live session) can report
 * context usage WITHOUT constructing an `AgentSession`. Unlike `mapping`,
 * this touches the Pi SDK at runtime (the token-estimation helpers), so it lives
 * in its own node-only module.
 *
 * The logic mirrors the SDK's `getContextUsage()` (pi `0.78`): trust the latest
 * assistant `usage` (real API token counts), estimate only the messages after
 * it, and fall back to `{ tokens: null }` when a compaction boundary has no
 * trustworthy post-compaction usage yet. The one piece this re-implements is
 * `estimateContextTokens` — the SDK exports its primitives (`estimateTokens`,
 * `calculateContextTokens`) but not the composite, nor `getContextUsage` as a
 * session-free function.
 */
import {
  calculateContextTokens,
  estimateTokens,
  getLatestCompactionEntry,
  type SessionEntry,
} from "@earendil-works/pi-coding-agent";
import type { PiContextUsage } from "../types";

/** A message that may carry assistant token usage. Structural so this module
 *  stays decoupled from the SDK's `AgentMessage` union. */
type MaybeAssistantMessage = {
  role?: string;
  stopReason?: string;
  usage?: unknown;
};

/** Usage from an assistant message, skipping aborted/error turns (no valid
 *  counts). Mirrors the SDK's private `getAssistantUsage`. */
const assistantUsage = (message: MaybeAssistantMessage): unknown => {
  if (
    message.role === "assistant" &&
    message.usage &&
    message.stopReason !== "aborted" &&
    message.stopReason !== "error"
  ) {
    return message.usage;
  }
  return undefined;
};

/** Tokens for `messages`: trust the last assistant usage, estimate the tail
 *  after it. Mirrors the SDK's `estimateContextTokens`. */
const estimateContextTokens = (
  messages: readonly MaybeAssistantMessage[],
): number => {
  let lastUsageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (assistantUsage(messages[i]!)) {
      lastUsageIndex = i;
      break;
    }
  }

  if (lastUsageIndex < 0) {
    let estimated = 0;
    for (const message of messages)
      estimated += estimateTokens(message as never);
    return estimated;
  }

  let tokens = calculateContextTokens(messages[lastUsageIndex]!.usage as never);
  for (let i = lastUsageIndex + 1; i < messages.length; i += 1) {
    tokens += estimateTokens(messages[i] as never);
  }
  return tokens;
};

/** True when a compaction boundary exists but no trustworthy assistant usage
 *  follows it — usage is unknown until the next LLM response. */
const compactionInvalidatesUsage = (
  branch: readonly SessionEntry[],
): boolean => {
  const latest = getLatestCompactionEntry(branch as SessionEntry[]);
  if (!latest) return false;
  const compactionIndex = branch.lastIndexOf(latest);
  for (let i = branch.length - 1; i > compactionIndex; i -= 1) {
    const entry = branch[i]!;
    if (entry.type !== "message") continue;
    const message = entry.message as MaybeAssistantMessage;
    if (message.role !== "assistant") continue;
    if (message.stopReason === "aborted" || message.stopReason === "error")
      continue;
    // Mirrors the SDK's break-at-first-assistant check, with one defensive
    // addition: a message without `usage` (the SDK would throw on it) counts
    // as "no trustworthy usage yet".
    return (
      !message.usage || calculateContextTokens(message.usage as never) <= 0
    );
  }
  return true;
};

/**
 * Context usage for a thread, computed purely from persisted data. Returns
 * `undefined` when usage can't be known (no model / no context window).
 */
export const deriveContextUsage = (
  contextWindow: number,
  branch: readonly SessionEntry[],
  messages: readonly unknown[],
): PiContextUsage | undefined => {
  if (contextWindow <= 0) return undefined;
  if (compactionInvalidatesUsage(branch)) {
    return { tokens: null, contextWindow, percent: null };
  }
  const tokens = estimateContextTokens(
    messages as readonly MaybeAssistantMessage[],
  );
  return { tokens, contextWindow, percent: (tokens / contextWindow) * 100 };
};
