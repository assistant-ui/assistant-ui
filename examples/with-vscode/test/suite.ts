import { writeFile } from "node:fs/promises";
import * as vscode from "vscode";
import type { ProbeReport } from "../src/readiness/runner";
import { SWITCHBOARD } from "../src/switchboard";

export type TestbedReport = { runs: (ProbeReport & { runtime: string })[] };

export async function run() {
  const reportPath = process.env.AUI_TESTBED_REPORT;
  if (!reportPath) throw new Error("AUI_TESTBED_REPORT is not set");
  const runtimes =
    process.env.AUI_TESTBED_RUNTIMES?.split(",").filter(Boolean) ??
    SWITCHBOARD.runtime.implemented;

  const extension = vscode.extensions.getExtension("assistant-ui.with-vscode");
  if (!extension)
    throw new Error("Extension assistant-ui.with-vscode not found");
  await extension.activate();

  const config = vscode.workspace.getConfiguration("auiTest");
  const report: TestbedReport = { runs: [] };
  for (const runtime of runtimes) {
    await config.update("runtime", runtime, vscode.ConfigurationTarget.Global);
    const result = await vscode.commands.executeCommand<ProbeReport>(
      "auiTest.runAllProbes",
    );
    report.runs.push({ runtime, ...result });
  }
  await writeFile(reportPath, JSON.stringify(report));
}
