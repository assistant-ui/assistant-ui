import * as vscode from "vscode";
import type { Switchboard } from "../switchboard";
import type { AssistantWebviews } from "../webviews";
import { PROBES, type Probe, type ProbeId, type ProbeResult } from "./probes";

export type HostProbeContext = {
  switchboard: Switchboard;
  webviews: AssistantWebviews;
  showAssistant(): Promise<void>;
};

export type HostProbe = (ctx: HostProbeContext) => Promise<ProbeResult>;

export type ProbeStatus = ProbeResult | { state: "running" };

export type ProbeReport = {
  webviewReady: boolean;
  results: (Probe & ProbeResult)[];
};

export const WEBVIEW_READY_TIMEOUT_MS = 20_000;
export const PROBE_TIMEOUT_MS = 60_000;
const withTimeout = (promise: Promise<ProbeResult>, ms: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<ProbeResult>((resolve) => {
      timer = setTimeout(
        () => resolve({ state: "fail", detail: `Timed out after ${ms} ms` }),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
};

export class ProbeRunner implements vscode.Disposable {
  private readonly statuses = new Map<ProbeId, ProbeStatus>();
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changeEmitter.event;

  constructor(
    private readonly hostProbes: Partial<Record<ProbeId, HostProbe>>,
    private readonly getContext: () => HostProbeContext,
  ) {}

  status(id: ProbeId) {
    return this.statuses.get(id);
  }

  async run(id: ProbeId): Promise<ProbeResult> {
    this.set(id, { state: "running" });
    const result = await this.execute(id).catch(
      (error: unknown): ProbeResult => ({
        state: "fail",
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
    this.set(id, result);
    return result;
  }

  async runAll(): Promise<ProbeReport> {
    const ctx = this.getContext();
    await ctx.showAssistant();
    const webviewReady =
      (await ctx.webviews.waitForReady(WEBVIEW_READY_TIMEOUT_MS)) !== undefined;
    const results: ProbeReport["results"] = [];
    for (const probe of PROBES) {
      results.push({ ...probe, ...(await this.run(probe.id)) });
    }
    return { webviewReady, results };
  }

  dispose() {
    this.changeEmitter.dispose();
  }

  private set(id: ProbeId, status: ProbeStatus) {
    this.statuses.set(id, status);
    this.changeEmitter.fire();
  }

  private async execute(id: ProbeId): Promise<ProbeResult> {
    const ctx = this.getContext();
    const hostProbe = this.hostProbes[id];
    if (hostProbe) return withTimeout(hostProbe(ctx), PROBE_TIMEOUT_MS);

    await ctx.showAssistant();
    const webview = await ctx.webviews.waitForReady(WEBVIEW_READY_TIMEOUT_MS);
    if (!webview) {
      return {
        state: "fail",
        detail: `Assistant webview was not ready within ${WEBVIEW_READY_TIMEOUT_MS} ms`,
      };
    }
    return ctx.webviews.runProbe(webview, id, PROBE_TIMEOUT_MS);
  }
}
