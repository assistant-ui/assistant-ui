import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runTests } from "@vscode/test-electron";
import type { TestbedReport } from "./suite.ts";

const rootDir = path.resolve(import.meta.dirname, "..");
const phase = Number(process.env.AUI_TESTBED_PHASE ?? "0");
const tempDir = await mkdtemp(path.join(tmpdir(), "aui-testbed-"));
const reportPath = path.join(tempDir, "report.json");

// Variables inherited from a VS Code terminal make the test instance start as plain Node.
for (const key of Object.keys(process.env)) {
  if (key === "ELECTRON_RUN_AS_NODE" || key.startsWith("VSCODE_")) {
    delete process.env[key];
  }
}

let launchError: unknown;
try {
  await runTests({
    version: process.env.AUI_TESTBED_VSCODE_VERSION ?? "stable",
    extensionDevelopmentPath: rootDir,
    extensionTestsPath: path.join(rootDir, "dist", "test", "suite.js"),
    extensionTestsEnv: {
      AUI_TESTBED_REPORT: reportPath,
      AUI_TESTBED_RUNTIMES: process.env.AUI_TESTBED_RUNTIMES,
    },
    launchArgs: [
      "--disable-extensions",
      // Chromium otherwise throttles timers in an occluded window, which stalls fixture streams.
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-workspace-trust",
      "--skip-welcome",
      "--skip-release-notes",
      `--user-data-dir=${path.join(tempDir, "user-data")}`,
    ],
  });
} catch (error) {
  launchError = error;
}

const report = await readFile(reportPath, "utf-8")
  .then((text) => JSON.parse(text) as TestbedReport)
  .catch(() => undefined);
await rm(tempDir, { recursive: true, force: true });

if (!report) {
  console.error("No probe report was written.", launchError ?? "");
  process.exit(1);
}

const columns = ["probe", "phase", "gated", "state", "detail"] as const;
let failed = report.runs.length === 0;

for (const run of report.runs) {
  const rows = run.results.map((r) => ({
    probe: r.id,
    phase: String(r.phase),
    gated: r.phase <= phase ? "yes" : "",
    state: r.state,
    detail: r.detail ?? "",
  }));
  const widths = columns.map((c) =>
    Math.max(c.length, ...rows.map((row) => row[c].length)),
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, i) => cell.padEnd(widths[i] ?? 0))
      .join("  ")
      .trimEnd();

  console.log(
    `\nAUI test bed probes (auiTest.runtime=${run.runtime}, AUI_TESTBED_PHASE=${phase})\n`,
  );
  console.log(line(columns));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const row of rows) console.log(line(columns.map((c) => row[c])));

  const failures = run.results.filter(
    (r) => r.phase <= phase && r.state !== "pass",
  );
  if (!run.webviewReady) {
    console.error(
      `\nThe Assistant webview never reported ready (runtime=${run.runtime}).`,
    );
  }
  if (failures.length > 0) {
    console.error(
      `\n${failures.length} probe(s) expected green by phase ${phase} are not passing under runtime=${run.runtime}: ${failures.map((f) => f.id).join(", ")}`,
    );
  }
  if (!run.webviewReady || failures.length > 0) failed = true;
}

if (launchError) console.error("\nVS Code test run failed:", launchError);

process.exit(failed || launchError ? 1 : 0);
