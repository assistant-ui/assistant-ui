import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runTests } from "@vscode/test-electron";
import type { ProbeReport } from "../src/readiness/runner.ts";

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
    extensionTestsEnv: { AUI_TESTBED_REPORT: reportPath },
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
  .then((text) => JSON.parse(text) as ProbeReport)
  .catch(() => undefined);
await rm(tempDir, { recursive: true, force: true });

if (!report) {
  console.error("No probe report was written.", launchError ?? "");
  process.exit(1);
}

const rows = report.results.map((r) => ({
  probe: r.id,
  phase: String(r.phase),
  gated: r.phase <= phase ? "yes" : "",
  state: r.state,
  detail: r.detail ?? "",
}));
const columns = ["probe", "phase", "gated", "state", "detail"] as const;
const widths = columns.map((c) =>
  Math.max(c.length, ...rows.map((row) => row[c].length)),
);
const line = (cells: readonly string[]) =>
  cells
    .map((cell, i) => cell.padEnd(widths[i] ?? 0))
    .join("  ")
    .trimEnd();

console.log(`\nAUI test bed probes (AUI_TESTBED_PHASE=${phase})\n`);
console.log(line(columns));
console.log(line(widths.map((w) => "-".repeat(w))));
for (const row of rows) console.log(line(columns.map((c) => row[c])));

const failures = report.results.filter(
  (r) => r.phase <= phase && r.state !== "pass",
);
if (!report.webviewReady) {
  console.error("\nThe Assistant webview never reported ready.");
}
if (failures.length > 0) {
  console.error(
    `\n${failures.length} probe(s) expected green by phase ${phase} are not passing: ${failures.map((f) => f.id).join(", ")}`,
  );
}
if (launchError) console.error("\nVS Code test run failed:", launchError);

process.exit(
  report.webviewReady && failures.length === 0 && !launchError ? 0 : 1,
);
