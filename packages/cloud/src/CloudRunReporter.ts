import type { AssistantCloud } from "./AssistantCloud";
import { CloudAPIError } from "./AssistantCloudAPI";
import { CloudResponseError } from "./cloudResponse";
import { createRunReport, type RunReportInit } from "./runTelemetry";

export type CloudRunReportInit = Omit<RunReportInit, "telemetry">;

/**
 * Sends run reports the way every client integration has to: nothing while
 * telemetry is off, the cloud's environment, release and tags on every report,
 * the `beforeReport` hook applied last, and a failed send that never surfaces.
 * A keyed report is deduplicated while in flight and after a successful or
 * terminal attempt. Retryable failures release the key so a later observation
 * can try again.
 */
export class CloudRunReporter {
  private readonly reported = new Set<string>();
  private readonly getCloud: () => AssistantCloud;

  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
  }

  public async report(init: CloudRunReportInit, key?: string): Promise<void> {
    let claimedKey: string | undefined;
    try {
      const cloud = this.getCloud();
      if (!cloud.telemetry.enabled) return;
      if (key !== undefined && this.reported.has(key)) return;

      const initial = createRunReport({ ...init, telemetry: cloud.telemetry });
      const { beforeReport } = cloud.telemetry;
      const report = beforeReport ? beforeReport(initial) : initial;
      if (!report) return;

      if (key !== undefined) {
        this.reported.add(key);
        claimedKey = key;
      }
      await cloud.runs.report(report);
    } catch (error) {
      if (claimedKey !== undefined && isRetryableReportError(error)) {
        this.reported.delete(claimedKey);
      }
      return;
    }
  }
}

const isRetryableReportError = (error: unknown): boolean => {
  if (error instanceof CloudResponseError) return false;
  if (error instanceof CloudAPIError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
};
