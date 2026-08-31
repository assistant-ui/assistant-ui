import { STATUS_URL } from "./constants";
import { withTimeout } from "./with-timeout";

export const STATUS_REVALIDATE = 300;

export type StatusState =
  | "operational"
  | "degraded"
  | "downtime"
  | "maintenance";

type StatusPagePayload = {
  data?: { attributes?: { aggregate_state?: unknown } };
};

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

export async function getStatusState(): Promise<StatusState | null> {
  try {
    const payload = await withTimeout(
      (async () => {
        const res = await fetch(`${STATUS_URL}/index.json`, {
          headers: { Accept: "application/json" },
          next: { revalidate: STATUS_REVALIDATE },
        });
        if (!res.ok) return null;
        return (await res.json()) as StatusPagePayload;
      })(),
    );
    return normalizeStatusState(payload?.data?.attributes?.aggregate_state);
  } catch {
    return null;
  }
}
