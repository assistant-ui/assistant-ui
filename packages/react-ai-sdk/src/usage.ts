import { useAuiState } from "@assistant-ui/react";

export type ThreadTokenUsage = {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

export interface TokenUsageExtractableMessage {
  role?: string;
  metadata?: unknown;
}

type UsageRecord = Record<string, unknown>;

const USAGE_KEYS = [
  "inputTokens",
  "outputTokens",
  "reasoningTokens",
  "cachedInputTokens",
  "totalTokens",
] as const satisfies (keyof ThreadTokenUsage)[];

function asRecord(value: unknown): UsageRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return value as UsageRecord;
}

function asPositiveTokenCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

function computeTotalTokens(usage: ThreadTokenUsage): number | undefined {
  if (usage.totalTokens !== undefined) return usage.totalTokens;
  if (usage.inputTokens !== undefined && usage.outputTokens !== undefined) {
    return usage.inputTokens + usage.outputTokens;
  }
  return undefined;
}

function normalizeUsage(value: unknown): ThreadTokenUsage | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const result: ThreadTokenUsage = {};
  let hasFields = false;
  for (const key of USAGE_KEYS) {
    const count = asPositiveTokenCount(record[key]);
    if (count !== undefined) {
      result[key] = count;
      hasFields = true;
    }
  }
  return hasFields ? result : undefined;
}

function withComputedTotal(
  usage: ThreadTokenUsage,
): ThreadTokenUsage | undefined {
  const totalTokens = computeTotalTokens(usage);
  return { ...usage, ...(totalTokens !== undefined && { totalTokens }) };
}

function usageFromSteps(value: unknown): ThreadTokenUsage | undefined {
  const steps = Array.isArray(value) ? value : [];

  const sums: Record<string, number> = {};
  const present: Record<string, boolean> = {};
  let stepsWithUsage = 0;
  let stepsWithComputableTotal = 0;

  for (const step of steps) {
    const usage = normalizeUsage(asRecord(step)?.usage);
    if (!usage) continue;
    stepsWithUsage++;

    const stepTotal = computeTotalTokens(usage);
    if (stepTotal !== undefined) {
      sums.totalTokens = (sums.totalTokens ?? 0) + stepTotal;
      stepsWithComputableTotal++;
    }

    for (const key of USAGE_KEYS) {
      if (key === "totalTokens") continue;
      if (usage[key] !== undefined) {
        sums[key] = (sums[key] ?? 0) + usage[key];
        present[key] = true;
      }
    }
  }

  if (stepsWithUsage === 0) return undefined;

  const result: ThreadTokenUsage = {};
  if (stepsWithComputableTotal === stepsWithUsage) {
    result.totalTokens = sums.totalTokens!;
  }
  for (const key of USAGE_KEYS) {
    if (key === "totalTokens") continue;
    if (present[key]) {
      result[key] = sums[key]!;
    }
  }
  return result;
}

export function getThreadMessageTokenUsage(
  message: TokenUsageExtractableMessage | undefined,
): ThreadTokenUsage | undefined {
  if (!message || message.role !== "assistant") return undefined;

  const metadata = asRecord(message.metadata);
  if (!metadata) return undefined;

  const topLevelUsage = normalizeUsage(metadata.usage);
  if (topLevelUsage) return withComputedTotal(topLevelUsage);

  const legacyUsage = normalizeUsage(asRecord(metadata.custom)?.usage);
  if (legacyUsage) return withComputedTotal(legacyUsage);

  return usageFromSteps(metadata.steps);
}

export function useThreadTokenUsage(): ThreadTokenUsage | undefined {
  const lastAssistant = useAuiState((s) =>
    s.thread.messages.findLast((m) => m.role === "assistant"),
  );
  return getThreadMessageTokenUsage(lastAssistant);
}
