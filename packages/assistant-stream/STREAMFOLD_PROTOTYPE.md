# Streamfold tool-argument reader prototype

This is a compatibility and performance prototype, not a recommendation to
replace every parser. It targets `ToolCallArgsReaderImpl` only. The message
accumulator still uses the existing parser, so this does not establish a chat
rendering speedup.

## Mechanism

- Keep the current lazy behavior: no parser work without active readers.
- Feed only previously unseen argument text into a retained Streamfold 0.1.5
  scanner while readers are active.
- Use immutable nested values and attach fresh, compatible root field metadata.
- Preserve the original parser for late readers and fallback after malformed,
  unsupported, over-limit, or prototype-bearing input. This keeps existing
  `secure-json-parse` behavior rather than broadening accepted input.
- Dispose retained Wasm state at EOF. Do not finalize incomplete fields merely
  because transport input ended.

No public exports, tool execution rules, or message accumulator behavior change.
The runtime dependency adds Streamfold's bundled Wasm; consumers do not need Rust.
The static Streamfold import currently requires `TextEncoder`. This prototype
does not establish React Native/platform parity; the import boundary and Wasm
availability must be checked before default adoption on those runtimes.

Validation completed locally: 519 core/utility tests and a focused strict
TypeScript check of the reader, parser, and their tests. The full monorepo build,
Redis peer lanes, size budgets, and public-pipeline performance run were not run
in this isolated harness.

## Local measurement

Baseline: assistant-ui `9a076642648ad4225d3f05ccdc69442023629c51`.
Candidate: the implementation in this branch, using npm `streamfold@0.1.5`.
Environment: Apple Silicon, macOS arm64, Node 23.11.0, Vitest 5.0.0.
This is below the monorepo's required Node 24, so CI/build verification on the
supported runtime is still required before adoption.

The direct reader experiment streamed a JSON object containing one string,
awaited every append, drained a `streamText("value")` subscriber when enabled,
and checked its final value. Three warmups and seven measured samples were run
per case, alternating baseline/candidate order. Timings include heap sampling
after each append. Numbers are milliseconds, median / nearest-rank p95:

| String bytes | Chunk chars | Observed | Baseline | Candidate |
| --- | --- | --- | --- | --- |
| 1,000 | 16 | No | 0.314 / 0.802 | 0.358 / 0.968 |
| 1,000 | 16 | Yes | 1.110 / 1.404 | 0.869 / 2.157 |
| 1,000 | 256 | No | 0.029 / 0.037 | 0.030 / 0.035 |
| 1,000 | 256 | Yes | 0.074 / 0.078 | 0.094 / 0.099 |
| 50,000 | 16 | No | 11.641 / 12.559 | 11.705 / 12.744 |
| 50,000 | 16 | Yes | 547.148 / 558.676 | 42.734 / 45.894 |
| 50,000 | 256 | No | 0.647 / 0.658 | 0.643 / 1.057 |
| 50,000 | 256 | Yes | 33.081 / 33.989 | 3.280 / 4.289 |

Large observed calls benefit in this fixture; small calls can regress. This is
not a universal latency claim. It excludes cold module/Wasm initialization and
does not measure UI rendering, growing arrays, or retained-history workloads.

Sampled heap growth was mixed: the 50 KB/16-char observed case was about
81.5 MB baseline versus 74.1 MB candidate; at 256 chars it was 3.7 MB versus
5.1 MB. GC was not forced, the measurements exclude Wasm memory and are not
retained-memory or leak measurements. Do not claim a general memory reduction.

## Repeatable upstream measurement

`packages/x-performance/bench/tool-args.bench.ts` now includes observed readers
at both sizes and chunk schedules alongside the existing execute-only control.
It exercises public `unstable_toolResultStream`, checks the final value, and can
run against built head/base dists through the existing performance workflow.
Those end-to-end pipeline numbers are separate from the direct-reader table.

Before considering merge: run the monorepo's Node 24 build, size budgets, full
test lanes, and paired performance workflow; inspect cold-start and growing
array/history memory costs; confirm that the additional dependency is wanted.
