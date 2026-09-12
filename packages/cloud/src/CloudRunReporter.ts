import type { AssistantCloud } from "./AssistantCloud";
import { createRunReport, type RunReportInit } from "./runTelemetry";

export type CloudRunReportInit = Omit<RunReportInit, "telemetry">;

/**
 * Sends run reports the way every client integration has to: nothing while
 * telemetry is off, the cloud's environment, release and tags on every report,
 * the `beforeReport` hook applied last, and a failed send that never surfaces.
 * A report given a key is sent once per key, so an integration that observes
 * the same finished run twice reports it once.
 */
export class CloudRunReporter {
  private readonly reported = new Set<string>();
  private readonly getCloud: () => AssistantCloud;

  constructor(cloud: AssistantCloud | (() => AssistantCloud)) {
    this.getCloud = typeof cloud === "function" ? cloud : () => cloud;
  }

  public async report(init: CloudRunReportInit, key?: string): Promise<void> {
    const cloud = this.getCloud();
    if (!cloud.telemetry.enabled) return;
    if (key !== undefined && this.reported.has(key)) return;

    const initial = createRunReport({ ...init, telemetry: cloud.telemetry });
    const { beforeReport } = cloud.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    if (key !== undefined) this.reported.add(key);
    await cloud.runs.report(report).catch(() => {});
  }
}
