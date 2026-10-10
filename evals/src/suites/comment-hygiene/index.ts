import type { Suite } from "../../types.ts";
import { runAgent } from "./agent.ts";
import { candidates } from "./candidates.ts";
import { cases } from "./cases/index.ts";
import { runJudge } from "./judge.ts";
import { passRate, renderReport } from "./report.ts";
import type { Candidate, EvalCase, Judged } from "./types.ts";

/**
 * Does a guidance sentence change how an agent treats code comments? The A/B
 * is the whole point: `baseline` (empty guidance) should reproduce the bad
 * behavior; a candidate earns its place only if it lifts the pass rate.
 */
export const commentHygiene: Suite<EvalCase, Candidate, Judged> = {
  id: "comment-hygiene",
  cases,
  candidates,
  run(c, candidate) {
    const artifact = runAgent(c, candidate.prompt);
    return { verdict: runJudge(c.rubric, artifact), artifact };
  },
  view: ({ verdict, artifact }) => ({
    mark: verdict.pass ? "." : "x",
    verdict: `${verdict.pass ? "PASS" : "FAIL"}: ${verdict.reason}`,
    artifact,
  }),
  summarize: (trials) => `${Math.round(passRate(trials) * 100)}%`,
  report: renderReport,
};
