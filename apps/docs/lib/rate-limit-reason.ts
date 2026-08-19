export const RATE_LIMIT_REASON_HEADER = "x-assistant-ui-rate-limit-reason";

export const RATE_LIMIT_REASONS = {
  ipBurst: "ip_burst",
  ipDaily: "ip_daily",
  identityDaily: "identity_daily",
  globalDaily: "global_daily",
  anonymousSessionIssuance: "anonymous_session_issuance",
} as const;

export type RateLimitReason =
  (typeof RATE_LIMIT_REASONS)[keyof typeof RATE_LIMIT_REASONS];
