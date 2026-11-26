import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  agentPrompt,
  BUNDLED_DOCS_DIR,
  runAgent,
  type DocsMode,
} from "./agent.ts";
import { bundleDocs } from "./bundle.ts";
import { buildAndStart, freePort } from "./app.ts";
import { CheckFailure, openDriver } from "./browser.ts";
import { docsFor } from "./docs.ts";
import { startMockLLM } from "./mock-llm.ts";
import { tasks, type AgentTask } from "./tasks.ts";
import { summarizeTranscript, type TranscriptSummary } from "./transcript.ts";
import type {
  CaseResult,
  Suite,
  SuiteCandidate,
  TrialResult,
} from "../../types.ts";

export interface DocsCandidate extends SuiteCandidate {
  /** Where the AI docs come from: the live site or a local `next dev` of apps/docs. */
  docsUrl: string;
  /** local: a docs folder beside the project; web: the live site; bundled: in the project with an AGENTS.md index. */
  mode: DocsMode;
}

export interface Outcome extends TranscriptSummary {
  pass: boolean;
  /** The first thing the app didn't do, such as "builds" or 'has an "Approve" button'. */
  failedStep?: string | undefined;
  detail?: string | undefined;
  agentSeconds: number;
  agentTimedOut: boolean;
  runDir: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, "..", "..", "..", "results", "agent-docs");
const runsRoot =
  process.env.AGENT_DOCS_RUNS_DIR ?? join(tmpdir(), "aui-agent-docs");
const model = process.env.AGENT_MODEL ?? "sonnet";
const timeoutMin = Number(process.env.AGENT_TIMEOUT_MIN ?? 30);
if (!Number.isFinite(timeoutMin) || timeoutMin <= 0) {
  throw new Error(
    `AGENT_TIMEOUT_MIN must be a positive number of minutes, not ${process.env.AGENT_TIMEOUT_MIN}`,
  );
}
const timeoutMs = timeoutMin * 60_000;
// Each suite invocation takes its own docs snapshot, so a changed docs site is never scored from an old copy.
const snapshotsDir = join(
  runsRoot,
  "docs",
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`,
);

const candidate: DocsCandidate = {
  label: process.env.DOCS_LABEL ?? "live",
  docsUrl: process.env.DOCS_URL ?? "https://www.assistant-ui.com",
  mode: (process.env.DOCS_MODE ?? "local") as DocsMode,
};
if (!/^[a-z0-9][a-z0-9._-]*$/i.test(candidate.label)) {
  throw new Error(
    `DOCS_LABEL names files and folders, so use letters, digits, dots, dashes and underscores, not ${candidate.label}`,
  );
}
if (!["local", "web", "bundled"].includes(candidate.mode)) {
  throw new Error(
    `DOCS_MODE must be local, web or bundled, not ${candidate.mode}`,
  );
}

async function runTrial(
  task: AgentTask,
  docs: DocsCandidate,
): Promise<Outcome> {
  const snapshot = await docsFor(docs.docsUrl, snapshotsDir);
  const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
  const runDir = join(runsRoot, "runs", `${task.id}-${docs.label}-${stamp}`);
  const projectDir = join(runDir, "app");
  mkdirSync(projectDir, { recursive: true });
  if (docs.mode === "bundled") bundleDocs(snapshot, projectDir);
  const docsDir =
    docs.mode === "bundled" ? join(projectDir, BUNDLED_DOCS_DIR) : snapshot;

  // The agent tests against one mock; the check gets a fresh one on the same port, so nothing the agent sent counts.
  const agentMock = await startMockLLM(0, join(runDir, "mock-agent.jsonl"));
  let agent;
  try {
    const prompt = agentPrompt(
      task.prompt(agentMock.url),
      docs.mode === "web" ? docs.docsUrl.replace(/\/$/, "") : docsDir,
      agentMock.url,
      docs.mode,
      await freePort(),
    );
    writeFileSync(join(runDir, "prompt.md"), prompt);
    agent = await runAgent({
      prompt,
      runDir,
      projectDir,
      docsDir: docs.mode === "local" ? docsDir : undefined,
      webDocs: docs.mode === "web" ? docs.docsUrl : undefined,
      model,
      timeoutMs,
    });
  } finally {
    await agentMock.close();
  }
  // An agent that ran out of time didn't finish the task; score it as an error, not as a build.
  if (agent.timedOut) {
    throw new Error(
      `the agent didn't answer within ${timeoutMin} min (${runDir})`,
    );
  }
  const summary = summarizeTranscript(
    agent.transcript,
    docsDir,
    new URL(docs.docsUrl).hostname,
  );

  const mock = await startMockLLM(
    agentMock.port,
    join(runDir, "mock-check.jsonl"),
  );
  const log = join(runDir, "check.log");
  let app: Awaited<ReturnType<typeof buildAndStart>> | undefined;
  let page: Awaited<ReturnType<typeof openDriver>> | undefined;
  let failure: CheckFailure | undefined;
  try {
    app = await buildAndStart(runDir, projectDir, log);
    page = await openDriver(app.url);
    await task.check(page, mock);
  } catch (error) {
    if (!(error instanceof CheckFailure)) {
      failure = new CheckFailure("runs the check", String(error));
    } else failure = error;
  } finally {
    await page?.close().catch(() => {});
    app?.stop();
    await mock.close();
  }

  const outcome: Outcome = {
    ...summary,
    pass: !failure,
    failedStep: failure?.step,
    detail: failure?.message,
    agentSeconds: agent.seconds,
    agentTimedOut: agent.timedOut,
    runDir,
  };
  mkdirSync(join(resultsDir, "trials"), { recursive: true });
  writeFileSync(
    join(resultsDir, "trials", `${task.id}--${docs.label}--${stamp}.json`),
    `${JSON.stringify({ task: task.id, label: docs.label, mode: docs.mode, docsUrl: docs.docsUrl, model, ...outcome }, null, 2)}\n`,
  );
  writeFileSync(join(runDir, "outcome.json"), JSON.stringify(outcome, null, 2));
  return outcome;
}

const passRate = (trials: TrialResult<Outcome>[]) => {
  const done = trials.flatMap((t) => (t.error ? [] : [t.outcome]));
  return {
    passed: done.filter((o) => o.pass).length,
    total: done.length,
    errors: trials.length - done.length,
  };
};
const score = ({ passed, total, errors }: ReturnType<typeof passRate>) =>
  `${passed}/${total}${errors ? ` (${errors} errored, unscored)` : ""}`;

export const agentDocs: Suite<AgentTask, DocsCandidate, Outcome> = {
  id: "agent-docs",
  cases: tasks,
  candidates: [candidate],
  concurrency: Number(process.env.AGENT_CONCURRENCY ?? 1),
  run: runTrial,
  view: (o) => ({
    mark: o.pass ? "✓" : "✗",
    verdict: o.pass
      ? `pass in ${Math.round((o.answerSeconds ?? o.agentSeconds) / 60)} min`
      : `fail at "${o.failedStep}": ${o.detail ?? ""}`,
    artifact: `${o.runDir}\n${o.finalMessage}`,
  }),
  summarize(trials) {
    return `${score(passRate(trials))} built and passed`;
  },
  report(results: CaseResult<AgentTask, DocsCandidate, Outcome>[]) {
    const rows = results.flatMap((r) =>
      r.variants.map((v) => {
        const rate = passRate(v.trials);
        const first = v.trials.find((t) => !t.error && !t.outcome.pass);
        const why =
          first && !first.error ? (first.outcome.failedStep ?? "") : "";
        return `| ${r.case.id} | ${v.candidate.label} (${v.candidate.mode}) | ${score(rate)} | ${why} |`;
      }),
    );
    return [
      "# agent-docs",
      "",
      `Model: ${model}. Each trial is a fresh agent with only the AI docs, building the task from an empty folder; the check builds, typechecks and drives the app in headless Chrome against a mock model.`,
      "",
      "| Task | Docs | Passed | First failed step |",
      "| --- | --- | --- | --- |",
      ...rows,
    ].join("\n");
  },
};
