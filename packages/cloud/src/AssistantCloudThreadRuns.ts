import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  readCloudNumber,
  readCloudRecord,
  readCloudString,
} from "./cloudResponse";
import type { CloudRunLease } from "./AssistantCloudThreadMessages";

/** Why a run ended. */
export type CloudRunEndReason = "done" | "cancelled" | "error";

export type AssistantCloudRunHeartbeatResponse = {
  heartbeat_interval_ms: number;
};

export type AssistantCloudThreadRunOpenBody = {
  /** The cloud id of the message the run answers. */
  parent_id?: string | null | undefined;
  /** The external id of the message the run answers, instead of `parent_id`. */
  parent_external_id?: string | undefined;
};

/**
 * Run leases on threads. A thread holds at most one running lease: opening
 * one ends the thread's other running lease, so the newest run wins and the
 * older holder's next beat or write answers `409 run_ended`. A lease runs
 * until its holder ends it; the server never expires one. The holder
 * heartbeats on the server's `heartbeat_interval_ms`, and message lists
 * report the thread's running lease with how long ago it last beat, so
 * readers can tell a run whose tab went away. The holder's first message
 * write with the `lease_id` stores the reply and binds the lease to it.
 */
export class AssistantCloudThreadRuns {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  /** Opens the thread's run lease, ending any other running lease of the thread. */
  public async open(
    threadId: string,
    body: AssistantCloudThreadRunOpenBody = {},
  ): Promise<CloudRunLease> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        `/threads/${encodeURIComponent(threadId)}/runs`,
        {
          method: "POST",
          body: {
            ...(body.parent_id !== undefined
              ? { parent_id: body.parent_id }
              : undefined),
            ...(body.parent_external_id !== undefined
              ? { parent_external_id: body.parent_external_id }
              : undefined),
          },
        },
      ),
      "run open response",
    );
    return {
      lease_id: readCloudString(response.lease_id, "lease_id"),
      heartbeat_interval_ms: readCloudNumber(
        response.heartbeat_interval_ms,
        "heartbeat_interval_ms",
      ),
    };
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
