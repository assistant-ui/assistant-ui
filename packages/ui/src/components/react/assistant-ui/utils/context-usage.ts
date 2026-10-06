export type TokenUsage = {
  totalTokens?: number | undefined;
  inputTokens?: number | undefined;
  cachedInputTokens?: number | undefined;
  outputTokens?: number | undefined;
  reasoningTokens?: number | undefined;
};

export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1_000_000)
    return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (tokens >= 1_000)
    return `${(tokens / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${tokens}`;
};

export const getUsagePercent = (
  totalTokens: number | undefined,
  modelContextWindow: number,
): number => {
  if (!totalTokens) return 0;
  return Math.min((totalTokens / modelContextWindow) * 100, 100);
};

type UsageSeverity = "normal" | "warning" | "critical";

const getUsageSeverity = (percent: number): UsageSeverity => {
  if (percent > 85) return "critical";
  if (percent >= 65) return "warning";
  return "normal";
};

export const getStrokeColor = (percent: number): string => {
  const severity = getUsageSeverity(percent);
  if (severity === "critical") return "stroke-red-500";
  if (severity === "warning") return "stroke-amber-500";
  return "stroke-foreground";
};

export const getBarColor = (percent: number): string => {
  const severity = getUsageSeverity(percent);
  if (severity === "critical") return "bg-red-500";
  if (severity === "warning") return "bg-amber-500";
  return "bg-foreground";
};

export const getPercentColor = (percent: number): string => {
  const severity = getUsageSeverity(percent);
  if (severity === "critical") return "text-red-500";
  if (severity === "warning") return "text-amber-500";
  return "text-muted-foreground";
};

type ContextSegment = {
  label: string;
  tokens: number;
};

// Whether a provider counts cached tokens inside inputTokens, or reasoning
// inside outputTokens, differs by provider: OpenAI reports cached_tokens as a
// subset of prompt_tokens, while Anthropic documents input_tokens as excluding
// cache_read_input_tokens. Nothing in the usage contract says which is in hand,
// so these are reported as the counts they are and none of them is given a
// share of the bar, which stays the one reading that always holds: the
// provider's own total against the window.
export const getContextSegments = (
  usage: TokenUsage | undefined,
): ContextSegment[] => {
  if (!usage) return [];
  return [
    { label: "Input", tokens: usage.inputTokens ?? 0 },
    { label: "Cached input", tokens: usage.cachedInputTokens ?? 0 },
    { label: "Output", tokens: usage.outputTokens ?? 0 },
    { label: "Reasoning", tokens: usage.reasoningTokens ?? 0 },
  ].filter((segment) => segment.tokens > 0);
};
