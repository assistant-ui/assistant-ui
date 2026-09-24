export type BudgetDenyCode =
  | "CHAT_TURN_LIMIT"
  | "CHAT_BUDGET_EXCEEDED"
  | "DAILY_BUDGET_EXCEEDED"
  | "DAILY_CHAT_LIMIT";

export type BudgetLimits = {
  chatBudgetMicroUsd: number;
  dailyBudgetMicroUsd: number;
  maxTurnsPerChat: number;
  maxChatsPerDay: number;
};

export type BudgetSnapshot = {
  sessionTurns: number;
  sessionSpentMicroUsd: number;
  dailySpentMicroUsd: number;
  dailyChatCount: number;
  isNewSession: boolean;
};

export type TokenUsage = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
};

const DEFAULT_INPUT_MICRO_USD_PER_M = 250_000;
const DEFAULT_OUTPUT_MICRO_USD_PER_M = 2_000_000;

export function usdToMicroUsd(usd: number): number {
  return Math.round(usd * 1_000_000);
}

/** Product defaults — used when env vars are unset. */
export const DEFAULT_BUDGET_LIMITS: BudgetLimits = {
  chatBudgetMicroUsd: usdToMicroUsd(1),
  dailyBudgetMicroUsd: usdToMicroUsd(2),
  maxTurnsPerChat: 8,
  maxChatsPerDay: 10,
};

export function parseUsdEnv(name: string, fallbackUsd: number): number {
  const raw = process.env[name];
  if (!raw) return usdToMicroUsd(fallbackUsd);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0)
    return usdToMicroUsd(fallbackUsd);
  return usdToMicroUsd(parsed);
}

export function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getBudgetLimits(): BudgetLimits {
  return {
    chatBudgetMicroUsd: parseUsdEnv(
      "XULUX_CHAT_BUDGET_USD",
      DEFAULT_BUDGET_LIMITS.chatBudgetMicroUsd / 1_000_000,
    ),
    dailyBudgetMicroUsd: parseUsdEnv(
      "XULUX_DAILY_BUDGET_USD",
      DEFAULT_BUDGET_LIMITS.dailyBudgetMicroUsd / 1_000_000,
    ),
    maxTurnsPerChat: parseIntEnv(
      "XULUX_MAX_TURNS_PER_CHAT",
      DEFAULT_BUDGET_LIMITS.maxTurnsPerChat,
    ),
    maxChatsPerDay: parseIntEnv(
      "XULUX_MAX_CHATS_PER_DAY",
      DEFAULT_BUDGET_LIMITS.maxChatsPerDay,
    ),
  };
}

export function estimateMicroUsd(usage: TokenUsage, _modelId?: string): number {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const inputMicro = (inputTokens * DEFAULT_INPUT_MICRO_USD_PER_M) / 1_000_000;
  const outputMicro =
    (outputTokens * DEFAULT_OUTPUT_MICRO_USD_PER_M) / 1_000_000;
  return Math.max(1, Math.ceil(inputMicro + outputMicro));
}

export function evaluateBudget(
  snap: BudgetSnapshot,
  limits: BudgetLimits,
): BudgetDenyCode | null {
  if (snap.dailySpentMicroUsd >= limits.dailyBudgetMicroUsd) {
    return "DAILY_BUDGET_EXCEEDED";
  }
  if (snap.sessionTurns >= limits.maxTurnsPerChat) {
    return "CHAT_TURN_LIMIT";
  }
  if (snap.sessionSpentMicroUsd >= limits.chatBudgetMicroUsd) {
    return "CHAT_BUDGET_EXCEEDED";
  }
  if (snap.isNewSession && snap.dailyChatCount >= limits.maxChatsPerDay) {
    return "DAILY_CHAT_LIMIT";
  }
  return null;
}

export function budgetDenyMessage(
  code: BudgetDenyCode,
  limits: BudgetLimits,
): string {
  switch (code) {
    case "CHAT_TURN_LIMIT":
      return `This chat reached the ${limits.maxTurnsPerChat}-message limit. Start a new chat to continue.`;
    case "CHAT_BUDGET_EXCEEDED":
      return `This chat reached the ~$${limits.chatBudgetMicroUsd / 1_000_000} usage limit. Start a new chat to continue.`;
    case "DAILY_BUDGET_EXCEEDED":
      return `Daily usage limit reached (~$${limits.dailyBudgetMicroUsd / 1_000_000}). Try again tomorrow.`;
    case "DAILY_CHAT_LIMIT":
      return `You reached the ${limits.maxChatsPerDay}-chat limit for today. Try again tomorrow.`;
  }
}

export function isDailyLimitCode(code: BudgetDenyCode): boolean {
  return code === "DAILY_BUDGET_EXCEEDED" || code === "DAILY_CHAT_LIMIT";
}

export function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
