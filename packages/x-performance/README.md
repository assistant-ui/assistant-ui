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

**Cross-ref comparison.** `aui-perf compare --ref <git-ref> [--runs N]` answers "did this branch regress anything" in one command: it materializes `<git-ref>` in a temporary worktree (one-time install and build of the measured packages, keyed by sha under the system temp dir), then alternates full suite runs between the current tree and the ref so thermal drift hits both sides evenly. The bench definitions always come from the current tree; only the measured package dists differ, resolved through a `resolveId` plugin (`src/ref-resolver.ts`) that maps every specifier for the measured packages, subpaths included, through the ref worktree's own exports maps, and throws on any subpath the ref does not export.

**Browser rendering lane.** `aui-perf trace <page.html...> [--seconds N]` measures what jsdom cannot: paint work and thread cost in the real rendering pipeline. It drives headless Chrome over raw CDP with no dependencies (Node's built-in WebSocket), records a DevTools-category trace per page, and reports renderer main-thread and compositor utilization plus PaintImage/Commit/PrePaint counts and compositor frames for the traced page's process. Chrome is located automatically; set `AUI_PERF_CHROME` to override. Trace numbers are performance evidence, not correctness evidence: a page that renders nothing traces beautifully, so pair every trace verdict with a visual check.

Benchmarks import only public package entry points so the react-compiler output is what gets measured. Rebuild the target packages (`pnpm turbo run build --filter=<pkg>`) before recording.
