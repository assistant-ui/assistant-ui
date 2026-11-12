import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { readCloudNumber, readCloudRecord } from "./cloudResponse";

/** Why a run ended. */
export type CloudRunEndReason = "done" | "cancelled" | "error";

export type AssistantCloudRunHeartbeatResponse = {
  heartbeat_interval_ms: number;
};

/**
 * Run leases on thread messages. A lease is opened with `open_run` when its
 * message is created, belongs to that message alone, and runs until its
 * holder ends it; the server never expires one. The holder heartbeats on the
 * server's `heartbeat_interval_ms`, and listed messages report how long ago
 * the last beat was, so readers can tell a run whose tab went away. Writes as
 * the holder go through `threads.messages` with the `lease_id`.
 */
export class AssistantCloudThreadRuns {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  /**
   * Records a beat of a running lease. 409 `run_ended` after it ended, 404
   * for a lease the server does not know.
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
      heartbeat_interval_ms: readCloudNumber(
        response.heartbeat_interval_ms,
        "heartbeat_interval_ms",
      ),
    };
  }

  /**
   * Ends a run without a content write; ending an ended run again succeeds
   * and keeps the first reason. 404 for a lease the server does not know.
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
