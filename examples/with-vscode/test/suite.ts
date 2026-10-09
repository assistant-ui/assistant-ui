import { writeFile } from "node:fs/promises";
import * as vscode from "vscode";
import type { ProbeResult } from "../src/readiness/probes";
import type { ProbeReport } from "../src/readiness/runner";
import type { ReadinessNode } from "../src/readiness/tree";

export type TestbedProbeResult = ProbeReport["results"][number] & {
  firstAttempt?: ProbeResult;
};

export type TestbedReport = {
  result?: {
    webviewReady: boolean;
    results: TestbedProbeResult[];
  };
  /** Set when the suite itself threw, with the stack. */
  error?: string;
  /** The last step the suite started; the report is saved at every step. */
  step?: string;
  finished?: boolean;
};

const describeError = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

export async function run() {
  const reportPath = process.env.AUI_TESTBED_REPORT;
  if (!reportPath) throw new Error("AUI_TESTBED_REPORT is not set");
  const report: TestbedReport = {};
  // Saved at every step, so a crash or hang leaves the step it stopped at.
  const step = async (name: string) => {
    report.step = name;
    await writeFile(reportPath, JSON.stringify(report));
  };
  try {
    await runSuite(report, step);
  } catch (error) {
    report.error = describeError(error);
  }
  report.finished = true;
  await writeFile(reportPath, JSON.stringify(report));
}

async function runSuite(
  report: TestbedReport,
  step: (name: string) => Promise<void>,
) {
  const extension = vscode.extensions.getExtension("assistant-ui.with-vscode");
  if (!extension)
    throw new Error("Extension assistant-ui.with-vscode not found");
  await extension.activate();

  await step("probes");
  const result = await vscode.commands.executeCommand<ProbeReport>(
    "auiTest.runAllProbes",
  );
  const results: TestbedProbeResult[] = [];
  for (const probe of result.results) {
    if (probe.state !== "fail") {
      results.push(probe);
      continue;
    }
    await step(`retry ${probe.id}`);
    const node: ReadinessNode = { kind: "probe", probe };
    const retry = await vscode.commands.executeCommand<ProbeResult>(
      "auiTest.runProbe",
      node,
    );
    const { state, detail, ...definition } = probe;
    results.push({
      ...definition,
      ...retry,
      firstAttempt: detail === undefined ? { state } : { state, detail },
    });
  }
  report.result = { webviewReady: result.webviewReady, results };
}
