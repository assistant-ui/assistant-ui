# @assistant-ui/x-performance

Internal performance measurement toolkit. Two disciplines, two tools:

**Deterministic counters (CI-gateable).** `createRenderCounter` counts exact component renders and Profiler commits. Performance invariants are written as ordinary vitest contract tests asserting integers ("one token append commits once, siblings render zero times"), so regressions fail red with no timing noise.

**Wall-time benchmarks (informational, never a merge gate).** `bench/*.bench.ts` files run through vitest bench against the built dist of published packages. The `aui-perf` CLI records environment-stamped baselines and diffs them:

```
pnpm -C packages/x-performance perf:record before.json
# ...make changes, rebuild the affected packages...
pnpm -C packages/x-performance perf:record after.json
pnpm -C packages/x-performance perf:compare before.json after.json
```

`compare` refuses to read significance into deltas smaller than twice the measured margin of error (with a 3% absolute floor), and warns when the two recordings come from different machines or Node versions. Baselines live in `.perf/` (gitignored). Borderline verdicts from a low `--runs` count are weak signals; confirm with `--runs 3` before believing them.

**Cross-ref comparison.** `aui-perf compare --ref <git-ref> [--runs N]` answers "did this branch regress anything" in one command: it materializes `<git-ref>` in a temporary worktree (one-time install and build of the measured packages, keyed by sha under the system temp dir), then runs one discarded warm-up pair (runner drift saturates, and burning the boosted-cold-start transient keeps the concave part of the curve out of the measurement), alternates full suite runs between the current tree and the ref, and compares each side's average over its runs. The alternation gives both sides equal time-slot sums (an odd `--runs` is rounded up to keep it balanced), so the remaining near-linear drift cancels from the difference of the averages, where min-of-runs across time-ordered slots would hand one side the drift curve's endpoints; twice the standard error of the per-pair deltas enters the noise floor as a third max() term, since per-run rme cannot see between-process variance. A head-vs-head calibration (`--ref HEAD`) should come back all ~same; that is the estimator's acceptance test, and `src/paired-compare.test.ts` pins the drift-cancellation property deterministically. High-variance jsdom microbenches can still straggle past the floor at `--runs 2`; a heavier even `--runs` tightens both the estimate and the floor, since the floor is a standard error rather than a range. The bench definitions always come from the current tree; only the measured package dists differ, resolved through a `resolveId` plugin (`src/ref-resolver.ts`) that maps every specifier for the measured packages, subpaths included, through the ref worktree's own exports maps, and throws on any subpath the ref does not export.

**Browser rendering lane.** `aui-perf trace <page.html...> [--seconds N]` measures what jsdom cannot: paint work and thread cost in the real rendering pipeline. It drives headless Chrome over raw CDP with no dependencies (Node's built-in WebSocket), records a DevTools-category trace per page, and reports renderer main-thread and compositor utilization plus PaintImage/Commit/PrePaint counts and compositor frames for the traced page's process. Chrome is located automatically; set `AUI_PERF_CHROME` to override. Trace numbers are performance evidence, not correctness evidence: a page that renders nothing traces beautifully, so pair every trace verdict with a visual check.

Benchmarks import only public package entry points so the react-compiler output is what gets measured. Rebuild the target packages (`pnpm turbo run build --filter=<pkg>`) before recording.

## Adding a measurement

Only instrument three kinds of code: paths that had a real incident, hot paths that run per token or per message, and decisions that need numbers before choosing an implementation. Then pick the instrument by the question, not the code:

- A behavior that can be counted (renders, commits, notifications, resource re-runs, calls) becomes a **counter contract**: an ordinary vitest test in `src/` asserting exact integers with `createRenderCounter`. Contracts gate CI. Use `useRender` inside components that own state, `track` for re-renders arriving from above (it cannot see a component's own state updates), and `wrapCommits` for commit counts. Hoist component objects or the memo boundaries you are asserting on will be defeated by the test itself. Assert what you measure, not what you expect; when the number surprises you, explain the mechanism in a comment and pin it.
- A speed question becomes a **bench** in `bench/`: import public entry points only, and add a baseline group when attribution is in doubt. Package-internal benches stay colocated in their own package instead. A package new to the measured set needs all four wirings: a workspace devDependency, an entry in `REF_PACKAGE_DIRS`, the `server.deps.external` regex, and the CI workflow paths.
- A rendering-pipeline question (paint, compositing, scrolling) becomes a **trace fixture**: a self-contained HTML page run through `aui-perf trace`. Trace numbers are performance evidence only; look at the page.

Reading results: `~same` means the delta stayed inside max(2×rme, 3%), or, for cross-ref runs, max(2×rme, 3%, 2×SE of the pair deltas); borderline rows at low `--runs` are weak signals; cross-machine recordings are warned about by design; and a green comparison only covers the paths a bench exercises, so an untouched-by-probes change reads as unmeasured, not as safe.
