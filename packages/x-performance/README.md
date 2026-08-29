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

`compare` refuses to read significance into deltas smaller than twice the measured margin of error, and warns when the two recordings come from different machines or Node versions. Baselines live in `.perf/` (gitignored).

Benchmarks import only public package entry points so the react-compiler output is what gets measured. Rebuild the target packages (`pnpm turbo run build --filter=<pkg>`) before recording.
