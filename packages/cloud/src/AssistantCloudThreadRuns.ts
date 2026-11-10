import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { readCloudNumber, readCloudRecord } from "./cloudResponse";
import {
  type CloudRunLease,
  decodeCloudRunLease,
} from "./AssistantCloudThreadMessages";

/**
 * Why a run ended. `interrupted` means its holder is going away (a closing
 * tab) while the reply is unfinished: the lease expires at once, so the
 * message reads `stale` and can be resumed right away instead of after the
 * lease's TTL.
 */
export type CloudRunEndReason = "done" | "cancelled" | "error" | "interrupted";

export type AssistantCloudRunHeartbeatResponse = {
  expires_in_ms: number;
  heartbeat_interval_ms: number;
};

/**
 * Run leases on thread messages. A run's holder keeps its lease alive with
 * heartbeats on the server's `heartbeat_interval_ms`; the server sets the
 * lease's TTL. A run that stops heartbeating reads as stale once its lease
 * expires, and an expired lease never comes back: heartbeats and writes with
 * it answer 409 `run_stale`. A new run opened under a stale message resumes
 * it and supersedes the stale lease. Writes as the holder go through
 * `threads.messages` with the `lease_id`.
 */
export class AssistantCloudThreadRuns {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  /** Opens a run lease on a stored message; 409 `run_in_progress` while it or its parent holds a live run. */
  public async open(
    threadId: string,
    messageId: string,
  ): Promise<CloudRunLease> {
    return decodeCloudRunLease(
      readCloudRecord(
        await this.cloud.makeRequest(
          `/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/runs`,
          { method: "POST" },
        ),
        "run open response",
      ),
    );
  }

  /**
   * Keeps a run lease alive. 409 `run_stale` once it expired, 409
   * `superseded` once another run resumed it, 409 `run_ended` after it ended.
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
   * 409 `run_stale` once the lease expired, 409 `superseded` once another
   * run resumed it. `keepalive` lets the request outlive a closing page.
   */
  public async end(
    threadId: string,
    leaseId: string,
    body: { reason?: CloudRunEndReason } = {},
    options: { keepalive?: boolean } = {},
  ): Promise<void> {
    await this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(leaseId)}/end`,
      {
        method: "POST",
        body,
        ...(options.keepalive ? { keepalive: true } : undefined),
      },
    );
  }
}
