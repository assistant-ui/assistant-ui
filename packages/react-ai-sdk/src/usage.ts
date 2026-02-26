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
// Internal types for parsing
type UsageRecord = Record<string, unknown>;
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
// Internal type that makes everything optional for the intermediate parsing steps
type ParsedUsage = {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  totalTokens?: number;
};

function hasAnyUsageField(parsed: ParsedUsage): boolean {
  return (
    parsed.inputTokens !== undefined ||
    parsed.outputTokens !== undefined ||
    parsed.reasoningTokens !== undefined ||
    parsed.cachedInputTokens !== undefined ||
    parsed.totalTokens !== undefined
  );
}

function normalizeUsage(value: unknown): ParsedUsage | undefined {
  const usage = asRecord(value);
  if (!usage) return undefined;
  const inputTokens = asPositiveTokenCount(usage.inputTokens);
  const outputTokens = asPositiveTokenCount(usage.outputTokens);
  const reasoningTokens = asPositiveTokenCount(usage.reasoningTokens);
  const cachedInputTokens = asPositiveTokenCount(usage.cachedInputTokens);
  const totalTokens = asPositiveTokenCount(usage.totalTokens);
  const result: ParsedUsage = {};
  if (inputTokens !== undefined) result.inputTokens = inputTokens;
  if (outputTokens !== undefined) result.outputTokens = outputTokens;
  if (reasoningTokens !== undefined) result.reasoningTokens = reasoningTokens;
  if (cachedInputTokens !== undefined)
    result.cachedInputTokens = cachedInputTokens;
  if (totalTokens !== undefined) result.totalTokens = totalTokens;

  if (!hasAnyUsageField(result)) {
    return undefined;
  }

  return result;
}
function buildUsageResult(parsed: ParsedUsage): ThreadTokenUsage | undefined {
  if (!hasAnyUsageField(parsed)) {
    return undefined;
  }
  const hasBothInputAndOutput =
    parsed.inputTokens !== undefined && parsed.outputTokens !== undefined;
  const totalTokens =
    parsed.totalTokens ??
    (hasBothInputAndOutput
      ? (parsed.inputTokens ?? 0) + (parsed.outputTokens ?? 0)
      : undefined);
  const result: ThreadTokenUsage = {};
  if (totalTokens !== undefined) result.totalTokens = totalTokens;
  if (parsed.inputTokens !== undefined) result.inputTokens = parsed.inputTokens;
  if (parsed.outputTokens !== undefined)
    result.outputTokens = parsed.outputTokens;
  if (parsed.reasoningTokens !== undefined)
    result.reasoningTokens = parsed.reasoningTokens;
  if (parsed.cachedInputTokens !== undefined)
    result.cachedInputTokens = parsed.cachedInputTokens;
  return result;
}
function usageFromSteps(value: unknown): ThreadTokenUsage | undefined {
  const steps = Array.isArray(value) ? value : [];
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;
  let cachedInputTokens = 0;
  let totalTokens = 0;
  let hasInput = false;
  let hasOutput = false;
  let hasReasoning = false;
  let hasCachedInput = false;
  let stepsWithUsage = 0;
  let stepsWithComputableTotal = 0;
  for (const step of steps) {
    const usage = normalizeUsage(asRecord(step)?.usage);
    if (!usage) continue;
    stepsWithUsage++;
    const stepHasBothInputAndOutput =
      usage.inputTokens !== undefined && usage.outputTokens !== undefined;
    const stepTotal =
      usage.totalTokens ??
      (stepHasBothInputAndOutput
        ? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
        : undefined);
    if (stepTotal !== undefined) {
      totalTokens += stepTotal;
      stepsWithComputableTotal++;
    }
    if (usage.inputTokens !== undefined) {
      inputTokens += usage.inputTokens;
      hasInput = true;
    }
    if (usage.outputTokens !== undefined) {
      outputTokens += usage.outputTokens;
      hasOutput = true;
    }
    if (usage.reasoningTokens !== undefined) {
      reasoningTokens += usage.reasoningTokens;
      hasReasoning = true;
    }
    if (usage.cachedInputTokens !== undefined) {
      cachedInputTokens += usage.cachedInputTokens;
      hasCachedInput = true;
    }
  }
  if (stepsWithUsage === 0) return undefined;
  const parsed: ParsedUsage = {};
  if (hasInput) parsed.inputTokens = inputTokens;
  if (hasOutput) parsed.outputTokens = outputTokens;
  if (hasReasoning) parsed.reasoningTokens = reasoningTokens;
  if (hasCachedInput) parsed.cachedInputTokens = cachedInputTokens;
  if (stepsWithComputableTotal === stepsWithUsage) {
    parsed.totalTokens = totalTokens;
  }
  const result: ThreadTokenUsage = {};
  if (parsed.totalTokens !== undefined) result.totalTokens = parsed.totalTokens;
  if (parsed.inputTokens !== undefined) result.inputTokens = parsed.inputTokens;
  if (parsed.outputTokens !== undefined)
    result.outputTokens = parsed.outputTokens;
  if (parsed.reasoningTokens !== undefined)
    result.reasoningTokens = parsed.reasoningTokens;
  if (parsed.cachedInputTokens !== undefined)
    result.cachedInputTokens = parsed.cachedInputTokens;
  return result;
}
export function getThreadMessageTokenUsage(
  message: TokenUsageExtractableMessage | undefined,
): ThreadTokenUsage | undefined {
  if (!message || message.role !== "assistant") return undefined;
  const metadata = asRecord(message.metadata);
  if (!metadata) return undefined;
  const topLevelUsage = normalizeUsage(metadata.usage);
  if (topLevelUsage) {
    return buildUsageResult(topLevelUsage);
  }
  const legacyUsage = normalizeUsage(asRecord(metadata.custom)?.usage);
  if (legacyUsage) {
    return buildUsageResult(legacyUsage);
  }
  return usageFromSteps(metadata.steps);
}
export function useThreadTokenUsage(): ThreadTokenUsage | undefined {
  const lastAssistant = useAuiState((s) =>
    s.thread.messages.findLast((m) => m.role === "assistant"),
  );
  return getThreadMessageTokenUsage(lastAssistant);
}
