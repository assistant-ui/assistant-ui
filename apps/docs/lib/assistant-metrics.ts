type TextPartLike = { type: string; text?: string };
type ToolCallPartLike = { type: string; toolName?: string };

export function getTextLength(parts: readonly TextPartLike[]): number {
  let length = 0;
  for (const part of parts) {
    if (part.type !== "text" || !part.text) continue;
    length += part.text.length;
  }
  return length;
}

export function countToolCalls(parts: readonly { type: string }[]): number {
  let count = 0;
  for (const part of parts) {
    if (part.type === "tool-call") count += 1;
  }
  return count;
}

export function getToolCallToolNames(
  parts: readonly ToolCallPartLike[],
): string[] {
  const toolNames: string[] = [];
  for (const part of parts) {
    if (part.type !== "tool-call") continue;
    if (typeof part.toolName !== "string") continue;
    toolNames.push(part.toolName);
  }
  return toolNames;
}

export function getAssistantMessageTokenUsage(
  message:
    | {
        role?: string;
        metadata?: unknown;
      }
    | undefined,
): {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
} {
  if (!message || message.role !== "assistant") return {};

  const metadata = message.metadata as Record<string, unknown> | undefined;
  const custom = metadata?.["custom"] as Record<string, unknown> | undefined;
  const usage = custom?.["usage"] as Record<string, number> | undefined;

  if (usage) {
    const totalTokens =
      usage["totalTokens"] ??
      (usage["inputTokens"] ?? 0) + (usage["outputTokens"] ?? 0);
    const inputTokens = usage["inputTokens"];
    const outputTokens = usage["outputTokens"];

    if (
      totalTokens > 0 ||
      inputTokens !== undefined ||
      outputTokens !== undefined
    ) {
      return {
        ...(totalTokens > 0 ? { totalTokens } : {}),
        ...(inputTokens !== undefined ? { inputTokens } : {}),
        ...(outputTokens !== undefined ? { outputTokens } : {}),
      };
    }
  }

  const steps = (metadata?.["steps"] ?? []) as Array<{
    usage?: { promptTokens: number; completionTokens: number };
  }>;

  let promptTokens = 0;
  let completionTokens = 0;
  for (const step of steps) {
    if (!step.usage) continue;
    promptTokens += step.usage.promptTokens;
    completionTokens += step.usage.completionTokens;
  }

  const totalTokens = promptTokens + completionTokens;
  if (totalTokens <= 0) return {};

  return {
    totalTokens,
    inputTokens: promptTokens,
    outputTokens: completionTokens,
  };
}
