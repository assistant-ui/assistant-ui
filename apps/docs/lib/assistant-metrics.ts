type TextPartLike = { type: string; text?: string };
type ToolCallPartLike = { type: string; toolName?: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

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

  const metadata = asRecord(message.metadata);
  const custom = asRecord(metadata?.["custom"]);
  const usage = asRecord(custom?.["usage"]);

  if (usage) {
    const rawTotalTokens = usage["totalTokens"];
    const rawInputTokens = usage["inputTokens"];
    const rawOutputTokens = usage["outputTokens"];

    const inputTokens =
      typeof rawInputTokens === "number" &&
      Number.isFinite(rawInputTokens) &&
      rawInputTokens >= 0
        ? rawInputTokens
        : undefined;
    const outputTokens =
      typeof rawOutputTokens === "number" &&
      Number.isFinite(rawOutputTokens) &&
      rawOutputTokens >= 0
        ? rawOutputTokens
        : undefined;

    const totalTokensFromParts = (inputTokens ?? 0) + (outputTokens ?? 0);
    const totalTokens =
      typeof rawTotalTokens === "number" &&
      Number.isFinite(rawTotalTokens) &&
      rawTotalTokens > 0
        ? rawTotalTokens
        : totalTokensFromParts > 0
          ? totalTokensFromParts
          : 0;

    if (totalTokens <= 0) return {};
    return {
      totalTokens,
      ...(inputTokens !== undefined ? { inputTokens } : {}),
      ...(outputTokens !== undefined ? { outputTokens } : {}),
    };
  }

  const steps = metadata?.["steps"];
  if (!Array.isArray(steps)) return {};

  let inputTokens = 0;
  let outputTokens = 0;
  for (const step of steps) {
    const usage = asRecord(asRecord(step)?.["usage"]);
    if (!usage) continue;
    const rawInputTokens = usage["inputTokens"];
    const rawOutputTokens = usage["outputTokens"];
    if (
      typeof rawInputTokens === "number" &&
      Number.isFinite(rawInputTokens) &&
      rawInputTokens >= 0
    ) {
      inputTokens += rawInputTokens;
    }
    if (
      typeof rawOutputTokens === "number" &&
      Number.isFinite(rawOutputTokens) &&
      rawOutputTokens >= 0
    ) {
      outputTokens += rawOutputTokens;
    }
  }

  const totalTokens = inputTokens + outputTokens;
  if (totalTokens <= 0) return {};

  return {
    totalTokens,
    inputTokens,
    outputTokens,
  };
}
