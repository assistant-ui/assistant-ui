import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { readCloudNumber, readCloudRecord } from "./cloudResponse";

/** Why a run ended. */
export type CloudRunEndReason = "done" | "cancelled" | "error";

export type AssistantCloudRunHeartbeatResponse = {
  expires_in_ms: number;
  heartbeat_interval_ms: number;
};

/**
 * Run leases on thread messages. A lease is opened with `open_run` when its
 * message is created and belongs to that message alone. Its holder keeps it
 * alive with heartbeats on the server's `heartbeat_interval_ms`; the server
 * sets the TTL. A run that stops heartbeating reads as stale once its lease
 * expires, and an expired lease never comes back: heartbeats and writes with
 * it answer 409 `run_stale`. Writes as the holder go through
 * `threads.messages` with the `lease_id`.
 */
export class AssistantCloudThreadRuns {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  /**
   * Keeps a run lease alive. 409 `run_stale` once it expired, 409
   * `run_ended` after it ended, 404 for a lease the server does not know.
   */
  public async heartbeat(
    threadId: string,
    leaseId: string,
  ): Promise<AssistantCloudRunHeartbeatResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        `/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(leaseId)}/heartbeat`,
        { method: "POST" },
      ),
      "run heartbeat response",
    );
    return {
      expires_in_ms: readCloudNumber(response.expires_in_ms, "expires_in_ms"),
      heartbeat_interval_ms: readCloudNumber(
        response.heartbeat_interval_ms,
        "heartbeat_interval_ms",
      ),
    };
  }

  /**
   * Ends a run without a content write; ending an ended run again succeeds.
   * 409 `run_stale` once the lease expired, 404 for a lease the server does
   * not know.
   */
  public async end(
    threadId: string,
    leaseId: string,
    body: { reason?: CloudRunEndReason } = {},
  ): Promise<void> {
    await this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(leaseId)}/end`,
      { method: "POST", body },
    );
  }
}
