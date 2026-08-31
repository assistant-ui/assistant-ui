import "server-only";
import { STATUS_URL } from "./constants";
import { normalizeStatusState, type StatusState } from "./status-state";
import { withTimeout } from "./with-timeout";

type StatusPagePayload = {
  data?: { attributes?: { aggregate_state?: unknown } };
};

export async function getStatusState(): Promise<StatusState | null> {
  try {
    const payload = await withTimeout(
      (async () => {
        const res = await fetch(`${STATUS_URL}/index.json`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
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
