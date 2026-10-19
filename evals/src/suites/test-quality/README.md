# Test-quality guidance eval

Compare the current repository test-quality guide with an unguided baseline using the existing agent and trial runner. The candidate loads `SKILL.md`, `tests.md`, and `mocking.md` directly, so it evaluates the current guidance rather than a copied prompt.

| Case | Fault the resulting test must catch |
| --- | --- |
| Real converter | Provider text is discarded while role and structure survive. |
| Independent wire fixture | Encoder and decoder both move the persisted format identifier. |
| Settled thread load | An old load overwrites a later selection. |
| Notification contract | One distinct selection emits duplicate notifications. |

The first three seeds are intentionally weak and pass with their faults present. The last is a positive control: its existing exact notification assertion must remain effective. These are small self-contained JavaScript fixtures representing assistant-ui contracts, not integration coverage for the published packages.

Each agent edits one test file using the fixture's existing Node test runner. Verification copies that output into a fresh directory with trusted implementation fixtures. Passing requires a successful run on correct code and an assertion failure on faulty code. A missing import, unconditional failure, skipped test, or non-assertion crash does not earn a passing verdict. Runner failures and timeouts are recorded as execution errors by the shared trial runner.

Requires an authenticated `claude` CLI on PATH. From `evals/`:

```sh
pnpm eval test-quality
TRIALS=5 pnpm eval test-quality settled-thread-load
pnpm test
```

The existing `AGENT_MODEL` setting selects the agent model; keep it fixed between candidates when comparing results. Reports retain generated tests, verdicts, and execution errors under `results/test-quality/latest.md`. Review the artifacts as well as the rate: these controlled faults cannot establish general test quality, and a baseline that already passes does not demonstrate a benefit from the guide. Offline fixture tests prove the evaluator distinguishes the seeded cases; only repeated model trials provide guidance evidence.
