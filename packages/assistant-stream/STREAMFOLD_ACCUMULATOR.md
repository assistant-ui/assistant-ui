# Streamfold message-argument draft

This draft automatically uses Streamfold's assistant-ui adapter in
`AssistantMessageAccumulator`. It preserves the existing message and tool UI
APIs. It needs a maintainer decision on the measured performance and dependency
trade-offs before default adoption.

Review this foundation together with #7728's selective activation policy. That
follow-up avoids initialization for small and complete arguments and releases
the scanner while processing structural updates between long strings.

## Mechanism and compatibility

- Load the engine on the first tool-argument update and share the module cache.
  Continue using the existing parser while loading, then seed retained state
  from the accumulated argument text. Ordinary text does not request the engine.
  When installed with Streamfold 0.1.8 or newer, await its cached asynchronous
  WASM preparation before activating it. Older supported versions retain their
  synchronous initialization behavior. Import and preparation failures resolve
  to the existing parser without repeated import attempts.
- Use a separate `assistantUI(pool)` adapter for each message part. An error in
  one adapter cannot abort another call, including calls sharing an ID.
- Publish immutable Streamfold values on string-append updates with fresh
  assistant-ui field-completion metadata. Preserve the original parser on
  structural updates: its speculative numbers/literals and malformed-prefix
  repair differ from Streamfold. This is a hybrid implementation, not a wholesale
  replacement of `parsePartialJsonObject`.
- Keep legacy parsing when platform APIs are missing, initialization fails,
  resource limits are exceeded, or input requires compatibility handling.
  Raw unpaired UTF-16, including a pair split across chunks, stays on the legacy
  path to preserve JavaScript string values. Escaped prototype-bearing keys keep
  `secure-json-parse`'s rejection behavior.
- Dispose sessions on argument completion, part completion, results, message
  completion, error, EOF, source failure, and consumer cancellation. Do not
  finalize incomplete JSON merely because its stream ended. The readable wrapper
  follows the existing `AssistantTransformStream` cancellation pattern because
  not every supported browser implements `Transformer.cancel`.

`ToolCallReader` remains a separate proposal in #7369 / #7371. The AI SDK's own
argument parsing is outside this change. Results, text, reasoning, tool execution,
and one-shot JSON parsing continue through their existing paths.

## Validation

The current foundation passes 778 assistant-stream tests in each Redis peer
lane with Streamfold 0.1.6 and 0.1.8, including live Redis and declaration checks.
The expanded coverage forces the optimized path above 4 KiB before testing
malformed suffixes, Unicode, root arrays, numeric precision, prototype-bearing
keys, 128 interleaved calls with duplicate IDs, and inputs over the 16 MiB limit.
Repeated cancellation with backpressured writes covers throttled and unthrottled
streams. Import failure and pending/rejected background compilation have focused
tests. Snapshot metadata now uses the same property descriptors as legacy values;
the descriptor regression tests fail against the initial implementation.

The original integration validation below was recorded on `a27e0963` before
these additional cases and the selective-activation follow-up:

Local validation on macOS arm64, Node 24, with the repository's pnpm 12.4.2:

- 738 assistant-stream tests passed with a live isolated Redis server in each
  ioredis 6 and ioredis 5 lane. Both lanes were exercised with Streamfold 0.1.6
  and 0.1.7: four runs, no skipped tests. Peer-v5 declarations also typechecked.
- Compatibility tests compare intermediate values and metadata for every prefix
  of the fixture corpus, plus deterministic malformed-input mutations under
  three chunk schedules. Tests cover immutable history, resumption, duplicate
  IDs, concurrent failures, missing platform APIs, and parser disposal.
- Downstream tests: core 2,049; react-data-stream 36; x-performance contracts and
  utilities 95. All passed.
- Node 24 builds completed for the selected package/dependency graph (13 build
  tasks). Strict typechecks passed for assistant-stream, core (including its
  separate test program), react-data-stream, and x-performance.
- Repository lint/format passed with existing warnings in unrelated files.
  API-surface verification and built-declaration checks passed for assistant-stream.
  The entry size budget is updated below; full consumer dependency size is
  measured separately.
- The five public-pipeline benchmark cases execute successfully through the
  repository's benchmark runner.
- Browser smoke checks in Chromium, Firefox, and WebKit cover normal WASM,
  CSP-blocked WASM, and unavailable WASM. Each verifies final arguments, stable
  earlier values/field status, cancellation, zero retained active parsers, and no
  uncaught page errors. The normal lane confirms the adapter actually receives
  deltas; fallback lanes confirm it does not receive deltas after unavailable
  or blocked initialization.

These checks cover the changed paths and their consumers, not every application
in the monorepo or a real React Native device. GitHub CI is a separate check.

## Initial integration timing evidence

Baseline: `3879342572a931376f7e217ee3922f7062b609a1`.
Both sides use built public `AssistantMessageStream` entries, the same generated
events, three warmups, and nine samples with alternating baseline/candidate
order. Values below are median milliseconds on one macOS arm64 machine. Timings
include stream plumbing and final result collection; fixture construction and
the final equality assertion are outside the measured interval. The input
stream is unpaced and these are warm measurements, not model/network latency.

| Fixture | Chunk characters | Existing | Draft |
| --- | ---: | ---: | ---: |
| Weather arguments | 16 | 0.130 | 0.224 |
| 1 KB string | 16 | 0.798 | 0.727 |
| 50 KB string | 16 | 679.471 | 74.905 |
| 50 KB string | 256 | 40.124 | 4.603 |
| 128 nested items | 64 | 6.580 | 8.602 |

Long strings benefit in these fixtures. The small weather case and nested-item
case regress. This draft is not evidence that every assistant-ui workload becomes
faster. `packages/x-performance/bench/message-arguments.bench.ts` provides the
public-entry fixtures for repeatable upstream measurements.

In seven fresh Node processes, isolated Streamfold initialization had medians of
2.673 ms for module import, 1.133 ms for the first scanner construction, and
1.066 ms for its first push plus disposal. This excludes network transfer and
browser scheduling. These measurements used 0.1.6, whose WASM compilation at
first scanner construction is synchronous. The current integration uses
background preparation when 0.1.8 or newer is installed.

## Download cost

The repository entry budget, which externalizes dependencies, moves from
16,546 to 17,543 gzip bytes for `assistant-stream`'s main entry (+997 bytes).

A minimal browser consumer exporting `AssistantMessageStream`, bundled with
dependencies and dynamic chunks using rolldown, measures:

| | Existing | Draft |
| --- | ---: | ---: |
| Initial chunk, gzip bytes | 5,217 | 6,112 |
| All chunks, gzip bytes | 5,217 | 33,950 |

The additional deferred chunks total 27,838 gzip bytes. This is a minimal
consumer measurement, not a claim about a complete application's bundle.

The dependency floor remains `^0.1.6`, locked to 0.1.6. The original pin respected
the repository's release-age policy; no policy exception is required by the
optional preparation capability. The combined follow-up tests 0.1.6, 0.1.7,
and 0.1.8.

## Before merge

Review the combined selection policy in #7728, small-input stream-wrapper cost,
download cost, startup on older Streamfold versions, and React Native behavior.
Re-run paired measurements in CI on the final diff. Review and land the combined
changes together rather than shipping this foundation's unconditional activation.
The draft must remain unmerged while those default-adoption decisions are open.
