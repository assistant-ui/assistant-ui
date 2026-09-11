export type StatusState =
  | "operational"
  | "degraded"
  | "downtime"
  | "maintenance";

/**
 * The provider documents "operational" and leaves the abnormal states unspecified,
 * so everything else is matched by substring: an unlisted spelling still reaches
 * the right badge rather than reading as no incident at all.
 */
export function normalizeStatusState(value: unknown): StatusState | null {
  if (typeof value !== "string") return null;

  const state = value.toLowerCase();
  if (state === "operational") return "operational";
  if (state.includes("maintenance")) return "maintenance";
  if (state.includes("degraded") || state.includes("partial"))
    return "degraded";
  if (state.includes("down") || state.includes("outage")) return "downtime";
  return null;
}
