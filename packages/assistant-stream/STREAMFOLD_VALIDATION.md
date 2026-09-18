# Streamfold integration validation

Recorded September 18, 2026, for the combined implementation in #7727 and #7728
(source commit `fb2e3d93be35c2aded5a4a9bca4908bdccce3930`). This supersedes the
initial timing and download measurements in `STREAMFOLD_ACCUMULATOR.md` for the
combined implementation. These are local results, separate from GitHub CI.

The dependency refresh to published Streamfold 0.1.9 was verified on
`e1ec19282ab74e64c7e5f739397b9e19e8861970`. The integration source is unchanged;
the range and lockfile now require the released bundle fix. A fresh registry
install succeeds with the version-specific release-age exception, and all 27
installed source files match the tagged release source.

## Behavior and fixes

The public message, tool UI, and standalone JSON parser APIs stay unchanged.
The accumulator uses Streamfold's immutable string-append snapshots while a
long string is arriving; the existing parser supplies structural updates and
compatibility fallback. It does not change model generation or network speed.

- Arguments below 2 KiB use the existing parser without allocating a session.
  A previously untracked argument ending in `}` or `]` goes directly to that
  parser, including malformed input that it must repair or reject.
- A small incremental string scan activates Streamfold only while an open
  string is at least 4 KiB. Closing that string releases the scanner. A later
  long string starts from the complete accumulated prefix, preserving history.
- Loading and preparation share a cached promise. With the current Streamfold
  0.1.9 floor, the existing parser remains active while asynchronous WASM
  preparation runs. Earlier tests also exercised 0.1.6 and 0.1.7, which
  initialize synchronously when used.
  Import/compilation failures retain the existing parser without retry loops.
- Partial metadata symbols now have the same writable/configurable/enumerable
  descriptors as the legacy parser. A regression test fails without this fix.
- End of input, explicit completion, results, source errors, and cancellation
  release active parsers. Incomplete JSON is not finalized by stream closure.

## Compatibility and stress checks

Environment: macOS arm64, Node 24.21.0, pnpm 12.4.2, live isolated Redis.

| Suite | Result |
| --- | --- |
| Combined assistant-stream, published Streamfold 0.1.9, ioredis 5 and 6 | 791 passed in each of two runs; no skipped tests |
| Foundation #7727, published Streamfold 0.1.9, ioredis 5 and 6 | 778 passed in each of two runs; no skipped tests |
| Combined assistant-stream, Streamfold 0.1.6 / 0.1.7 / 0.1.8, each with ioredis 5 and 6 | 791 passed in each of six runs; no skipped tests |
| Foundation #7727, Streamfold 0.1.6 / 0.1.8, each with ioredis 5 and 6 | 778 passed in each of four runs; no skipped tests |
| Core | 2,049 passed |
| React data stream | 36 passed |
| Performance contracts and utilities | 96 passed |
| Public message-argument benchmark fixtures | Seven executed successfully |

The 0.1.9 refresh also reran all three downstream suites above (2,049 core,
36 react-data-stream and 96 performance-contract tests), both package builds
and strict typechecks, both peer-v5 declaration checks, API-surface and built
declaration verification, changesets, and workspace-range checks. All passed.
Frozen lockfile installs in both draft worktrees pass the dependency policies.

Coverage includes every-prefix value and field-metadata comparisons, immutable
earlier snapshots, malformed suffixes after actual parser activation, duplicate
keys, root arrays, negative zero and large numbers, escaped strings, Unicode and
split surrogate pairs, prototype-bearing keys, resumed messages, 128 interleaved
calls sharing IDs, and inputs exceeding the 16 MiB resource limit. Seeded long
string cases use three chunk schedules and multiple scanner reactivations.
Repeated backpressured cancellation runs with throttling both enabled and
disabled. Import rejection, pending preparation, and preparation rejection have
dedicated tests. Lifecycle checks assert zero retained active parser handles.

The React contract drives the built public `AssistantMessageStream` through an
external-store runtime into a tool component. It checks streamed values and
field status, the completed result, and a stable earlier snapshot. One tool
delta causes one tool render and zero renders of its text sibling. This verifies
existing rendering behavior; it is not a visual redesign or screenshot test.

The selected dependency graph built successfully (13 build tasks). Strict
typechecks passed for assistant-stream, its peer-v5 declarations, core including
tests, react-data-stream, and x-performance. Focused lint/format, changesets,
workspace ranges, assistant-stream API-surface and built-declaration checks
passed. Size budgets passed for built entries; unbuilt packages were skipped.

## Browser checks

All 18 combinations with published 0.1.9 passed: Chromium 153.0.8010.48,
Firefox 153.0, and WebKit 26.5 with these six environments. The earlier 36
combinations with 0.1.6 and 0.1.8 also passed:

1. Normal WASM support.
2. Content Security Policy blocks WASM compilation.
3. `WebAssembly` unavailable.
4. `TextEncoder` unavailable.
5. `atob` unavailable.
6. Dynamic module loading fails.

Each loads the bundled public API and checks cold and warm streams, interleaved
duplicate IDs, text and results, stable earlier values/metadata, and 12
cancellation/error/EOF cycles. Normal runs confirm actual adapter pushes;
fallback runs confirm none. No active handles remain and no uncaught page errors
occur. Small arguments and a complete 50 KB argument do not request the deferred
modules. This does not cover every browser or real React Native devices.

## Paired local pipeline timings

Baseline: `3879342572a931376f7e217ee3922f7062b609a1`. Both sides use built public
`AssistantMessageStream` entries and identical prebuilt events. Three warmups
precede nine alternating baseline/candidate batches. The table reports median
milliseconds per stream. Timing includes stream plumbing and result collection;
fixture construction and final equality assertions are outside the interval.
These unpaced, warm Node measurements are not browser frame-time or model-latency
measurements, and are not statistical guarantees for other machines.
These timings retain their original 0.1.6/0.1.8 version labels; they were not
remeasured for the dependency-only 0.1.9 update.

| Fixture | Chunk characters | Baseline with 0.1.6 run | Combined 0.1.6 | Baseline with 0.1.8 run | Combined 0.1.8 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Weather arguments | 16 | 0.044 | 0.049 | 0.037 | 0.037 |
| 1 KB string | 16 | 0.719 | 0.813 | 0.582 | 0.626 |
| 50 KB string | 16 | 626.755 | 39.908 | 590.504 | 38.358 |
| 50 KB string | 256 | 42.432 | 4.030 | 39.305 | 3.538 |
| 128 nested items | 64 | 7.740 | 7.562 | 6.834 | 7.006 |
| Complete 50 KB argument | Single chunk | 0.086 | 0.090 | 0.069 | 0.071 |
| 16 KB string followed by 128 nested items | 64 | 40.785 | 25.702 | 35.838 | 22.182 |
| Ordinary text, 1,000 deltas | 5 | 1.775 | 2.290 | 1.927 | 2.267 |
| 1 MiB string | 1,024 | 4,852.815 | 168.761 | 4,319.829 | 154.514 |

The baseline has no Streamfold dependency; its columns are separate paired
runs. The long-string cases improve substantially. Small/structural workloads
do not consistently improve, and the cancellation-safe stream wrapper still
adds measurable overhead to ordinary text. That trade-off remains relevant to
default adoption, even though the absolute differences here are sub-millisecond.

Background preparation does not guarantee a faster first request. The first
unpaced 50 KB / 16-character stream with 0.1.8 took 592.838 ms versus 564.903 ms
for the baseline; it can complete on the legacy path before preparation is ready.
That is a single cold observation, not a cold-start distribution.

The seven committed public-entry fixtures are in
`packages/x-performance/bench/message-arguments.bench.ts`. Execute with:

```sh
pnpm --filter @assistant-ui/x-performance exec vitest bench bench/message-arguments.bench.ts --run
```

## Download cost and separate package fix

A minimal browser consumer exporting `AssistantMessageStream`, minified with
Rolldown 1.2.8 and including all transitive/dynamic chunks, measures:

| Configuration | Initial gzip bytes | All chunks, gzip bytes |
| --- | ---: | ---: |
| Existing baseline | 5,217 | 5,217 |
| Combined with published Streamfold 0.1.6 | 6,339 | 34,177 |
| Combined with published Streamfold 0.1.8 | 6,340 | 55,747 |
| Combined with published Streamfold 0.1.9 | 6,341 | 34,243 |

Testing exposed a minifier duplication of the embedded WASM payload when both
0.1.8 startup paths are retained. The merged
[Streamfold #69](https://github.com/assistant-ui/streamfold/pull/69) fixes the
shared decoding helper. Its regression test fails on the published code with
two payload copies and passes with one; both generated startup paths execute.
The fix is released in
[Streamfold 0.1.9](https://github.com/assistant-ui/streamfold/releases/tag/v0.1.9).
Remeasuring with the installed registry package confirms the 21,504 gzip-byte
saving in this consumer compared with published 0.1.8.

The assistant-stream entry measurement, which externalizes dependencies, is
17,785 gzip bytes against the draft's 17,543-byte budget, within its tolerance.
That budget does not represent the full consumer cost above.

## Review and adoption

#7728 targets #7727's feature branch. It can be merged into that branch first,
then the combined change reviewed and landed on main. Avoid shipping the
foundation's unconditional activation policy alone. Both PRs remain drafts.
The repository's main code-quality workflow only runs on PRs targeting main;
the stacked #7728 therefore has local validation, not a matching full GitHub CI
run. The performance workflow also skips drafts. Run those checks on the
combined main-targeting PR before merging to main.

Before default adoption, maintainers should review the remaining small/text
overhead and download cost, repeat paired performance measurements on the final
diff, and validate any required real React Native/device environments. The
dependency is now `^0.1.9`, locked to 0.1.9. A version-specific
`minimumReleaseAgeExclude` entry permits the requested same-day upgrade; other
packages and future Streamfold versions retain the 24-hour delay.
Passing these checks supports the tested paths; it does not prove every existing
application or runtime is regression-free.
