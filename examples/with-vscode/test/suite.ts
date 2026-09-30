import { writeFile } from "node:fs/promises";
import * as vscode from "vscode";
import type { ProbeReport } from "../src/readiness/runner";

export async function run() {
  const reportPath = process.env.AUI_TESTBED_REPORT;
  if (!reportPath) throw new Error("AUI_TESTBED_REPORT is not set");

  const extension = vscode.extensions.getExtension("assistant-ui.with-vscode");
  if (!extension)
    throw new Error("Extension assistant-ui.with-vscode not found");
  await extension.activate();

  const report = await vscode.commands.executeCommand<ProbeReport>(
    "auiTest.runAllProbes",
  );
  await writeFile(reportPath, JSON.stringify(report));
}
