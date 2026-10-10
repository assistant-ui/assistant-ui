# Assistant-ui eval-dashboard evidence — 2026-10-08

This record covers the local `codex/eval-dashboard-integration` branch. The
agent was `claude-haiku-4-5`; the independent judge was `claude-sonnet-5`.
Authentication used an Anthropic Platform key read from macOS Keychain and
passed through `ANTHROPIC_API_KEY`. No credential is stored in this repository.

The reports contain synthetic code fixtures evaluated by real model calls.
They prove model behavior for these prompts and models; they do not represent
production user conversations, tool trajectories, token usage, or a broad
statistical benchmark.

## Raw reports

| File | Rows | Matched expectations | Purpose | SHA-256 |
| --- | ---: | ---: | --- | --- |
| `five-suite-exploratory.json` | 22 | 16/22 | One trial for every applicable candidate across all five suites | `970a0bcaaebcd3f98e743b039fc3c85f37fa2589b65b07afe19ae9becd7a3e66` |
| `registry-before-guidance-revision.json` | 6 | 5/6 | Three paired trials before clarifying that registry files are generated | `5c8ae3849f5cbff108a6e1c19d5a862ba11ad856b1837798434d989c0ff05e6f` |
| `registry-source-of-truth.json` | 6 | 6/6 | Final three paired registry trials: baseline 0/3, guidance 3/3 | `c1eb9191269db02051bc58b13f00ae99de10ad3518028d3cdd3bab6c9db8a2fa` |
| `optional-before-structured-judge.json` | 6 | 5/6 | Captured malformed/misread judge output before schema enforcement | `f13aab552aaaf775fd66ef571cb5d150db1b4f167401f126edde92ff038ddf88` |
| `optional-guided-variance.json` | 3 | 2/3 | Guided-only rerun showing a real caret-range agent miss | `272295e110ca14a0d26a178e30c580e652d4d1dc5f7d7fa8e277c9c13a851b34` |
| `optional-host-sdk-dependency.json` | 6 | 6/6 | Final three paired dependency trials: baseline 0/3, guidance 3/3 | `2f16247c5a4e6c10a7c74c60130560dc9865455a79403ee162261163fa235dea` |
| `pr-review-comments.json` | 6 | 3/6 | Final three paired comment trials: baseline 0/3, `delete-stale` 0/3 | `119232a58ce2600870173d2d699b6d73a9050faa0ef61a6e3cbf95b04a5b2f80` |

All selected reports have `schemaVersion: "eval-report/v1"`, zero execution
errors, and explicit model identifiers. A scan of the raw JSON reports for an
Anthropic secret-key prefix returned no matches. No API key or Keychain item
name is stored in the evidence files.

## Findings and changes

1. The first extra comment-hygiene fixtures did not satisfy the roadmap's
   requirement to expand beyond comment hygiene; one also failed to reproduce.
   They were replaced with two cases derived from checked-in repository rules:
   registry source ownership and optional host-SDK dependency placement.
2. Both new baselines reproduced their risks. Registry baseline agents edited
   only `apps/registry`; dependency baseline agents omitted optional-peer
   metadata or used inappropriate version ranges.
3. Candidate scoping was added so comment guidance is not reported against
   package and registry suites. The Markdown renderer now uses the union of
   executed candidates and shows `—` for non-applicable cells instead of
   inventing `0%` results.
4. The first three-trial registry guidance scored 2/3. Clarifying that registry
   files are generated and naming the source/destination boundary produced 3/3
   in the final paired rerun.
5. The optional-SDK guidance showed variance: 2/3 in one structured-judge run
   because an agent used `^0.38.2` in `devDependencies`, then 3/3 in the final
   paired rerun. The final result is positive evidence, not a claim of
   deterministic behavior.
6. The judge once returned malformed JSON and once misread a caret range.
   `judge.ts` now supplies a strict JSON schema. Agent and judge non-zero exits
   now retain stdout when stderr is empty, so API failures are reviewable.
7. The established `delete-stale` guidance regressed to 0/3 on the final Haiku
   rerun. Its gate remains red and the artifact is preserved. Earlier one-trial
   success is not treated as stronger evidence than this larger contradictory
   sample.
8. In the five-suite exploratory run, `bugfix-comments` and `verbose-new-code`
   baselines passed. Those cases did not reproduce their intended mistakes on
   this model and should not be used as proof that their guidance is necessary.

## Commands and observed exits

The model commands used the same credential prefix, omitted here only to avoid
repeating secret-handling mechanics:

```sh
TRIALS=1 AGENT_MODEL=claude-haiku-4-5 JUDGE_MODEL=claude-sonnet-5 node src/cli.ts
# exit 0; 5 suites, 22 rows, 0 execution errors

TRIALS=3 CANDIDATES=baseline,edit-registry-source AGENT_MODEL=claude-haiku-4-5 JUDGE_MODEL=claude-sonnet-5 node src/cli.ts registry-source-of-truth
# exit 0; baseline 0/3, guidance 3/3

TRIALS=3 CANDIDATES=baseline,optional-host-sdk-peer AGENT_MODEL=claude-haiku-4-5 JUDGE_MODEL=claude-sonnet-5 node src/cli.ts optional-host-sdk-dependency
# exit 0; baseline 0/3, guidance 3/3

TRIALS=3 CANDIDATES=baseline,delete-stale AGENT_MODEL=claude-haiku-4-5 JUDGE_MODEL=claude-sonnet-5 node src/cli.ts pr-review-comments
# exit 0; baseline 0/3, guidance 0/3
```

Artifact validation and rendering:

```sh
npm run dashboard:lint
npm run dashboard:check
npm run dashboard
```

- Final registry report: exits `0`, `0`, `0`; lint had no issues.
- Final optional-SDK report: exits `0`, `0`, `0`; lint had no issues.
- Final PR-review report: exits `0`, `1`, `0`; lint reported three expected
  candidate mismatches and the gate reported a 0.500 matched-expectation rate.
- Five-suite exploratory report: exits `0`, `1`, `0`; lint reported 13 warnings
  and the gate reported a 0.727 matched-expectation rate.

Local implementation verification after the fixes:

```sh
npm run lint:fix        # exit 0
npm test                # exit 0; 3 files, 7 tests
npm run typecheck       # exit 0
npm run dashboard:smoke # exit 0; synthetic plumbing verification only
npm ci                  # exit 0; 122 packages audited, 0 vulnerabilities
npm audit --audit-level=high # exit 0; 0 vulnerabilities
```

The focused host-app route verification also passed:

```sh
pnpm --filter @assistant-ui/docs test next.config.test.ts
# exit 0; 1 file, 4 tests
```

Generated HTML and local archive directories remain ignored; the raw JSON
reports above are committed evidence.
