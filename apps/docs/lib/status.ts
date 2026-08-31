import "server-only";
import { STATUS_URL } from "./constants";
import { withTimeout } from "./with-timeout";

export const STATUS_REVALIDATE = 300;

export type StatusState =
  | "operational"
  | "degraded"
  | "downtime"
  | "maintenance";

const STATUS_STATES = new Set<string>([
  "operational",
  "degraded",
  "downtime",
  "maintenance",
]);

type StatusPagePayload = {
  data?: { attributes?: { aggregate_state?: unknown } };
};

/** Resolves to null whenever the status page is unreachable or reports a state we do not render. */
export async function getStatusState(): Promise<StatusState | null> {
  try {
    const res = await withTimeout(
      fetch(`${STATUS_URL}/index.json`, {
        headers: { Accept: "application/json" },
        next: { revalidate: STATUS_REVALIDATE },
      }),
    );
    if (!res.ok) return null;

    const state = ((await res.json()) as StatusPagePayload).data?.attributes
      ?.aggregate_state;
    return typeof state === "string" && STATUS_STATES.has(state)
      ? (state as StatusState)
      : null;
  } catch {
    return null;
  }
}
