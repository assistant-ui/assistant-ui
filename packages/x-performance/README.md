# @assistant-ui/x-performance

Internal performance measurement toolkit. It separates what can gate a merge from what can only inform one, and it keeps the two from being confused for each other.

## Layout

```
contracts/   counter contracts: exact render, commit, notification, parse, and conversion integers asserted as ordinary vitest tests
bench/       wall-time benches run by vitest bench against the built dist of the measured packages
fixtures/    trace fixtures: self-contained pages (plus an optional same-name .css entry) for the headless-Chrome lane
src/         createRenderCounter, the helper this package exports so other packages can colocate their own contracts
lib/         aui-perf internals: suite runner, ref worktree, bench attribution, paired statistics, report renderers, size budgets, history, CDP tracer
bin/         the aui-perf command
```

## Disciplines and CI tiers

| Tier | What | Where it runs | Fails a PR |
| --- | --- | --- | --- |
| Exact counters | Renders, commits, store notifications, markdown parses, converter calls, animation-frame commits, and post-unmount retention, pinned as integers in `contracts/` against the built dists, or colocated next to the behavior when a contract needs a package's own internals | The ordinary test job, through `turbo test` | Yes, with zero tolerance. The numbers are deterministic, so a changed integer is a deliberate PR that re-pins it and explains the mechanism |
| Toolchain proof | `pnpm check:resource-memo` proves the React Compiler still memoizes resources after a compiler or Babel bump | The lint job | Yes |
| Size budgets | `pnpm size:check` bundles every published client entry with rolldown (all bare imports external, minified, gzip) and compares it with `size-budgets.json` at the repo root | The build job, after the changed packages are built; it measures the entries that job built, which are exactly the ones whose dist could have changed | Yes, on a move past max(2%, 256 B) in either direction. `pnpm size:update` after a full build re-records the entries that moved and the diff rides in the PR |
| Wall-time benches | `bench/*.bench.ts` head against base, paired and interleaved on one runner | The Performance workflow, as one sticky PR comment shared with the trace lane | Never. Only an infrastructure error reddens the job |
| Rendering-pipeline traces | `fixtures/*.html` through headless Chrome, base against head, paint and compositor counts plus a screenshot per side | The same workflow and comment, when a fixture or a CSS package changes | Never |
| Longitudinal record | `aui-perf record` on main every night, appended to the `perf-history` branch and rendered as a trend table | The Performance Nightly workflow | Never |

A counter contract answers "did this change break a memo boundary". A bench answers "did this change make a hot path slower". A size budget answers "did this change ship more bytes". Neither answers the others' questions, and a green comparison covers only the paths a probe exercises: a change no probe touches reads as unmeasured, not as safe.

A bench sees only the work its own flush reaches. `flushSync` flushes discrete work, so anything React schedules at transition priority (a `useDeferredValue` pass, most obviously) lands after the sample closes and is invisible to that row. A bench that needs to measure such a pass has to settle it inside the callback, which changes what the sample includes: those rows become a series of their own and stop being comparable with the rows that do not. The markdown bench carries both, and the counter contracts remain the only evidence for how many times a deferred path parses.

## Reading the PR comment

The comment leads with two lines per lane and hides everything else behind a fold. A `machine-readable` fold at the end carries the same data as JSON (`aui-perf/compare@1`, `aui-perf/trace@1`) for review agents.

- **Measured** rows are benches that exercise at least one package whose built `dist` differs between base and head. Attribution is automatic: each bench file's imports are scanned, closed over the measured packages' workspace dependencies, and intersected with the dists whose content hash changed. Only these rows carry a verdict.
- **Control** rows are benches whose measured dists are byte-identical on both sides. They cannot have moved for a real reason, so each one is a free test of its own analytic floor. The header reports how many crossed theirs and by how much the worst one overshot, which is the run reporting its own false-positive rate.

Every row has an analytic floor: twice the larger per-run margin of error, an absolute 3%, and for cross-ref runs twice the standard error of the per-pair deltas. A measured row is `SLOWER` or `FASTER` only when its delta clears that floor scaled by the worst control overshoot of the run, so a run whose unchanged benches drifted 1.4× past their floors demands 1.4× from the changed ones too. Everything else is `~same`. A PR that changes none of the measured dists gets a one-line "nothing to measure" header, and its rows still run as controls so the calibration keeps accumulating. Calibrating with a ratio rather than the largest control delta keeps one intrinsically jittery microbench (a memoized path measured in tens of microseconds carries a 30% to 50% floor of its own) from masking a real move elsewhere.

The trace section shows `base → head` per fixture. Trace numbers are performance evidence, not correctness evidence: a page that renders nothing traces beautifully, so the workflow uploads both screenshots as the `trace-screenshots` artifact and the comment says so.

## Commands

```
pnpm -C packages/x-performance perf:record before.json
# ...make changes, rebuild the affected packages...
pnpm -C packages/x-performance perf:record after.json
pnpm -C packages/x-performance perf:compare before.json after.json
```

`record` runs the suite N times (default 3) and keeps the best mean per bench in an environment-stamped JSON under the gitignored `.perf/`. `compare a b` diffs two recordings and warns when they come from different machines, Node versions, or estimators. Sub-microsecond benches need the 3% absolute floor; borderline verdicts from a low `--runs` are weak signals.

**Cross-ref comparison.** `aui-perf compare --ref <git-ref> [--runs N] [--json file] [--report file.md]` answers "did this branch regress anything" in one command. It materializes `<git-ref>` in a temporary worktree (one-time install and build of the measured packages, keyed by sha under the system temp dir), runs one discarded warm-up pair (runner drift saturates, and burning the boosted cold start keeps the concave part of the curve out of the measurement), then alternates full suite runs between the current tree and the ref and compares each side's average. The alternation gives both sides equal time-slot sums (an odd `--runs` is rounded up), so the remaining near-linear drift cancels from the difference of the averages, where min-of-runs across time-ordered slots would hand one side the drift curve's endpoints. Twice the standard error of the per-pair deltas enters the noise floor because per-run rme cannot see between-process variance, and unlike a range it tightens as runs accumulate. `--ref HEAD` is the estimator's acceptance test: every row is a control and the header must say nothing to measure. The bench definitions always come from the current tree; only the measured dists differ, resolved through the `resolveId` plugin in `lib/ref-resolver.ts`, which maps every specifier for a measured package through the ref worktree's own exports map and throws on a subpath the ref does not export. Ref packages get `react` and `react-dom` re-pointed at the current tree's copies, at their own `node_modules` and at the pnpm store entries their third-party dependencies resolve through, so both sides share one React instance; a comparison spanning a React bump therefore measures the packages, never React.

**Browser rendering lane.** `aui-perf trace <fixture.html...> [--seconds N]` measures what jsdom cannot: paint work and thread cost in the real rendering pipeline. It drives headless Chrome over raw CDP with no dependencies (Node's built-in WebSocket), records a DevTools-category trace per page, writes a full-page screenshot next to it in `.perf/`, and reports renderer main-thread and compositor utilization plus PaintImage, Commit, and PrePaint counts and compositor frames for the traced page's process. `aui-perf trace --ref <git-ref> <fixture.html...>` traces both sides. A fixture's optional `.css` entry imports package CSS by a path relative to `fixtures/`; staging rewrites those imports to absolute paths under one side's repository root and compiles the entry with the current tree's tailwind, so the fixture definition is shared and only the imported package sources differ, and nothing is written into the ref worktree. Chrome is located automatically; set `AUI_PERF_CHROME` to override.

**Report assembly.** `aui-perf report --out comment.md [--bench bench.json] [--trace trace.json]` stacks whichever lanes ran under one sticky-comment marker and appends the machine-readable fold; the workflow posts that file and also writes it to the job summary.

**Size budgets.** `aui-perf size [--update] [--json file]` (`pnpm size:check` and `pnpm size:update` at the root) enumerates every published package's JavaScript export entries, skips tooling packages and entries whose dist is not built, bundles each entry with rolldown, and compares gzip bytes with `size-budgets.json`. A budget is the size recorded the last time its entry moved past the tolerance of max(2%, 256 B). `--update` rewrites only the entries that moved, so the diff carries exactly what a change grew or shrank and not the sub-tolerance drift of another machine's toolchain or dist state; a shrink past tolerance also asks for the update so the file stays truthful.

**Nightly record.** `aui-perf history append --dir <dir> [--from recording.json]` and `aui-perf history render --dir <dir> [--out README.md]` maintain the `perf-history` branch: one JSON point per night, rendered as a table of latest, Δ7d, Δ30d, min, max, and point count per bench with a drift marker past 10%.

Benchmarks import only public package entry points so the react-compiler output is what gets measured. Rebuild the target packages (`pnpm turbo run build --filter=<pkg>`) before recording.

## What the contracts currently pin

- A token appended to the streaming message re-renders only that message's text part. It commits twice (host state, then the adapter push through the store) on the external-store and AI SDK runtimes and once on the local runtime, in a 2-message and a 200-message thread alike; `convertMessage` runs once per token.
- Mounting a 200-message thread renders and converts each message once in a single commit.
- A markdown message re-parses its whole text once per token, with `defer` on or off: the renderer is memoized, so the urgent pass of a deferred pair carries text that was already parsed and bails out, while only the paragraph that changed re-renders.
- Smooth streaming commits once per animation frame while draining a chunk; `minCommitMs` batches those commits; smoothing off commits once per chunk.
- One store slice write notifies once and re-renders only that slice's subscriber; part memoization keys on shallow field identity, not on the outer part object.
- Unmounting releases the runtime, the converted messages, and the external messages.

## Adding a measurement

Only instrument three kinds of code: paths that had a real incident, hot paths that run per token or per message, and decisions that need numbers before choosing an implementation. Then pick the instrument by the question, not the code:

- A behavior that can be counted (renders, commits, notifications, parses, resource re-runs, calls, retained objects) becomes a **counter contract** asserting exact integers with `createRenderCounter`. Drive updates through React's `act` so the adapter's passive-effect push settles inside the step; under `flushSync` alone that push lands at the next flush and single-token reads sit one commit behind. Cross-package pipeline contracts live in `contracts/`; a contract that needs one package's own dependencies lives in that package and takes the helper from this package as a devDependency. Use `useRender` inside components that own state, `track` for re-renders arriving from above (it cannot see a component's own state updates), and `wrapCommits` for commit counts. Hoist component objects or the memo boundaries you are asserting on will be defeated by the test itself. Assert what you measure, not what you expect; when the number surprises you, explain the mechanism in a comment and pin it.
- A speed question becomes a **bench** in `bench/`: import public entry points only, and add a baseline group when attribution is in doubt. Package-internal benches stay colocated in their own package instead. A package new to the measured set needs four wirings: a workspace devDependency, an entry in `lib/ref-packages.mjs`, the `server.deps.external` regex in `vitest.config.ts`, and the workflow's path filter and build step. Attribution then follows from the package's own `package.json` dependencies.
- A rendering-pipeline question (paint, compositing, scrolling) becomes a **trace fixture** in `fixtures/`: a self-contained page, plus a same-name `.css` entry when a package's CSS is under test. The workflow's lane filter names the packages whose changes run it.
- A bytes question is already covered: every published client entry is budgeted. A new public entry shows up as `new` until `pnpm size:update` records it.
