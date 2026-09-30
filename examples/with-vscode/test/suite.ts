import { writeFile } from "node:fs/promises";
import * as vscode from "vscode";
import type { ProbeReport } from "../src/readiness/runner";
import { SWITCHBOARD } from "../src/switchboard";
import { captureThemeScreenshots } from "./screenshots";

export type TestbedReport = {
  runs: (ProbeReport & { runtime: string })[];
  screenshots?: { files: string[]; error?: string };
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
  const report: TestbedReport = { runs: [] };
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
  const runtimes =
    process.env.AUI_TESTBED_RUNTIMES?.split(",").filter(Boolean) ??
    SWITCHBOARD.runtime.implemented;

  const extension = vscode.extensions.getExtension("assistant-ui.with-vscode");
  if (!extension)
    throw new Error("Extension assistant-ui.with-vscode not found");
  await extension.activate();

  const config = vscode.workspace.getConfiguration("auiTest");
  for (const runtime of runtimes) {
    await step(`probes (runtime=${runtime})`);
    await config.update("runtime", runtime, vscode.ConfigurationTarget.Global);
    const result = await vscode.commands.executeCommand<ProbeReport>(
      "auiTest.runAllProbes",
    );
    report.runs.push({ runtime, ...result });
  }

  const cdpPort = Number(process.env.AUI_TESTBED_CDP_PORT);
  const screenshotDir = process.env.AUI_TESTBED_SCREENSHOTS;
  if (cdpPort && screenshotDir) {
    const files: string[] = [];
    report.screenshots = { files };
    try {
      await captureThemeScreenshots(cdpPort, screenshotDir, files, step);
    } catch (error) {
      report.screenshots.error = describeError(error);
    }
  }
}
