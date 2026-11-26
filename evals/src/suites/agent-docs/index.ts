import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { agentPrompt, runAgent } from "./agent.ts";
import { buildAndStart, useBin } from "./app.ts";
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
const timeoutMs = Number(process.env.AGENT_TIMEOUT_MIN ?? 30) * 60_000;

const candidate: DocsCandidate = {
  label: process.env.DOCS_LABEL ?? "live",
  docsUrl: process.env.DOCS_URL ?? "https://www.assistant-ui.com",
};

async function runTrial(
  task: AgentTask,
  docs: DocsCandidate,
): Promise<Outcome> {
  const docsDir = await docsFor(docs.docsUrl, join(runsRoot, "docs"));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = join(runsRoot, "runs", `${task.id}-${docs.label}-${stamp}`);
  const projectDir = join(runDir, "app");
  mkdirSync(projectDir, { recursive: true });

  // The agent tests against one mock; the check gets a fresh one on the same port, so nothing the agent sent counts.
  const agentMock = await startMockLLM(0, join(runDir, "mock-agent.jsonl"));
  const prompt = agentPrompt(
    task.prompt(agentMock.url),
    docsDir,
    agentMock.url,
  );
  writeFileSync(join(runDir, "prompt.md"), prompt);
  let agent;
  try {
    agent = await runAgent({
      prompt,
      runDir,
      projectDir,
      docsDir,
      model,
      timeoutMs,
    });
  } finally {
    await agentMock.close();
  }
  const summary = summarizeTranscript(agent.transcript, docsDir);

  const mock = await startMockLLM(
    agentMock.port,
    join(runDir, "mock-check.jsonl"),
  );
  const log = join(runDir, "check.log");
  useBin(join(runDir, "bin"));
  let app: Awaited<ReturnType<typeof buildAndStart>> | undefined;
  let page: Awaited<ReturnType<typeof openDriver>> | undefined;
  let failure: CheckFailure | undefined;
  try {
    app = await buildAndStart(projectDir, log);
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
    `${JSON.stringify({ task: task.id, label: docs.label, docsUrl: docs.docsUrl, model, ...outcome }, null, 2)}\n`,
  );
  writeFileSync(join(runDir, "outcome.json"), JSON.stringify(outcome, null, 2));
  return outcome;
}

const passRate = (trials: TrialResult<Outcome>[]) => {
  const done = trials.flatMap((t) => (t.error ? [] : [t.outcome]));
  return { passed: done.filter((o) => o.pass).length, total: done.length };
};

export const agentDocs: Suite<AgentTask, DocsCandidate, Outcome> = {
  id: "agent-docs",
  cases: tasks,
  candidates: [candidate],
  concurrency: Number(process.env.AGENT_CONCURRENCY ?? 1),
  run: runTrial,
  view: (o) => ({
    mark: o.pass ? "✓" : "✗",
    verdict: o.pass
      ? `pass in ${Math.round(o.agentSeconds / 60)} min`
      : `fail at "${o.failedStep}": ${o.detail ?? ""}`,
    artifact: `${o.runDir}\n${o.finalMessage}`,
  }),
  summarize(trials) {
    const { passed, total } = passRate(trials);
    return `${passed}/${total} built and passed`;
  },
  report(results: CaseResult<AgentTask, DocsCandidate, Outcome>[]) {
    const rows = results.flatMap((r) =>
      r.variants.map((v) => {
        const { passed, total } = passRate(v.trials);
        const first = v.trials.find((t) => !t.error && !t.outcome.pass);
        const why =
          first && !first.error ? (first.outcome.failedStep ?? "") : "";
        return `| ${r.case.id} | ${v.candidate.label} | ${passed}/${total} | ${why} |`;
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
