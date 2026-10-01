import {
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { runTests } from "@vscode/test-electron";
import type { TestbedReport } from "./suite.ts";

const rootDir = path.resolve(import.meta.dirname, "..");
const phase = Number(process.env.AUI_TESTBED_PHASE ?? "0");
const vscodeVersion = process.env.AUI_TESTBED_VSCODE_VERSION ?? "stable";
const tempDir = await mkdtemp(path.join(tmpdir(), "aui-testbed-"));
const reportPath = path.join(tempDir, "report.json");
const resultsDir = path.join(rootDir, "test-results");
await rm(resultsDir, { recursive: true, force: true });
await mkdir(resultsDir, { recursive: true });
const screenshotDir = process.argv.includes("--screenshots")
  ? path.join(rootDir, "screenshots")
  : undefined;

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address
          ? resolve(address.port)
          : reject(new Error("No port")),
      );
    });
  });
// The suite captures the window over the DevTools Protocol on this port.
const cdpPort = screenshotDir ? await freePort() : undefined;

// Variables inherited from a VS Code terminal make the test instance start as plain Node.
for (const key of Object.keys(process.env)) {
  if (key === "ELECTRON_RUN_AS_NODE" || key.startsWith("VSCODE_")) {
    delete process.env[key];
  }
}

let launchError: unknown;
try {
  await runTests({
    version: vscodeVersion,
    extensionDevelopmentPath: rootDir,
    extensionTestsPath: path.join(rootDir, "dist", "test", "suite.js"),
    extensionTestsEnv: {
      AUI_TESTBED_REPORT: reportPath,
      AUI_TESTBED_PHASE: String(phase),
      AUI_TESTBED_RUNTIMES: process.env.AUI_TESTBED_RUNTIMES,
      AUI_TESTBED_STUB_OPEN_EXTERNAL: "1",
      AUI_TESTBED_CDP_PORT: cdpPort?.toString(),
      AUI_TESTBED_SCREENSHOTS: screenshotDir,
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
      ...(cdpPort ? [`--remote-debugging-port=${cdpPort}`] : []),
    ],
  });
} catch (error) {
  launchError = error;
}

const report = await readFile(reportPath, "utf-8")
  .then((text) => JSON.parse(text) as TestbedReport)
  .catch(() => undefined);
await cp(
  path.join(tempDir, "user-data", "logs"),
  path.join(resultsDir, "logs"),
  { recursive: true },
).catch(() => undefined);
await rm(tempDir, { recursive: true, force: true });

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const summary: string[] = [];
const escapeCell = (text: string) =>
  text.replace(/[\\|]/g, "\\$&").replace(/\s+/g, " ").slice(0, 300);

const finish = async (failed: boolean) => {
  await writeFile(
    path.join(resultsDir, "probe-report.json"),
    `${JSON.stringify({ phase, vscodeVersion, failed, ...report }, null, 2)}\n`,
  );
  if (summaryPath) await appendFile(summaryPath, `${summary.join("\n")}\n`);
  process.exit(failed ? 1 : 0);
};

if (!report) {
  console.error("No probe report was written.", launchError ?? "");
  summary.push("No probe report was written.");
  await finish(true);
  process.exit(1);
}

if (!report.finished) {
  console.error(
    `\nThe suite stopped during "${report.step ?? "startup"}" without finishing.`,
  );
  summary.push(
    `The suite stopped during \`${report.step ?? "startup"}\` without finishing.\n`,
  );
}
if (report.error) console.error(`\nThe suite threw: ${report.error}`);

const columns = [
  "probe",
  "phase",
  "gated",
  "state",
  "retry",
  "detail",
] as const;
let failed =
  report.runs.length === 0 || !report.finished || report.error !== undefined;

for (const run of report.runs) {
  const rows = run.results.map((r) => ({
    probe: r.id,
    phase: String(r.phase),
    gated: r.phase <= phase ? "yes" : "",
    state: r.state,
    retry: r.firstAttempt ? `after ${r.firstAttempt.state}` : "",
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

  const title = `AUI test bed probes (auiTest.runtime=${run.runtime}, AUI_TESTBED_PHASE=${phase})`;
  console.log(`\n${title}\n`);
  console.log(line(columns));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const row of rows) console.log(line(columns.map((c) => row[c])));

  summary.push(
    `### ${title}\n`,
    `| ${columns.join(" | ")} |`,
    `|${columns.map(() => " --- ").join("|")}|`,
    ...rows.map(
      (row) => `| ${columns.map((c) => escapeCell(row[c])).join(" | ")} |`,
    ),
    "",
  );

  const retried = run.results.filter((r) => r.firstAttempt);
  if (retried.length > 0) {
    const lines = retried.map(
      (r) =>
        `${r.id}: ${r.state} on retry; first attempt: ${r.firstAttempt?.detail ?? r.firstAttempt?.state}`,
    );
    console.log(
      `\n${retried.length} probe(s) failed once and were run again (runtime=${run.runtime}):\n${lines.join("\n")}`,
    );
    summary.push(
      `${retried.length} probe(s) failed once and were run again:\n`,
      ...lines.map((l) => `- ${escapeCell(l)}`),
      "",
    );
  }

  const failures = run.results.filter(
    (r) => r.phase <= phase && r.state !== "pass",
  );
  if (!run.webviewReady) {
    console.error(
      `\nThe Assistant webview never reported ready (runtime=${run.runtime}).`,
    );
  }
  if (failures.length > 0) {
    const message = `${failures.length} probe(s) expected green by phase ${phase} are not passing under runtime=${run.runtime}: ${failures.map((f) => f.id).join(", ")}`;
    console.error(`\n${message}`);
    summary.push(`**${message}**\n`);
  }
  if (!run.webviewReady || failures.length > 0) failed = true;
}

if (screenshotDir) {
  const { files = [], error } = report.screenshots ?? {};
  if (files.length > 0) {
    const sheets = files.filter((f) => f.endsWith(".html"));
    console.log(
      `\n${files.length - sheets.length} screenshots in ${screenshotDir}${sheets.map((f) => `\nContact sheet: ${f}`).join("")}`,
    );
    summary.push(
      `${files.length - sheets.length} screenshots, ${sheets.length} contact sheet(s).\n`,
    );
  }
  if (error || files.length === 0) {
    console.error(`\nScreenshots failed: ${error ?? "none were taken"}`);
    summary.push(
      `**Screenshots failed:** ${escapeCell(error ?? "none were taken")}\n`,
    );
    failed = true;
  }
}

if (launchError) console.error("\nVS Code test run failed:", launchError);

await finish(failed || Boolean(launchError));
