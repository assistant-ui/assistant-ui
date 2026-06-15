# @assistant-ui/react-pi

## 0.0.4

### Patch Changes

- [#4422](https://github.com/assistant-ui/assistant-ui/pull/4422) [`e100f90`](https://github.com/assistant-ui/assistant-ui/commit/e100f906489f27d5193b6c8be80a6f87c5667850) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.3

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.2

### Patch Changes

- [#4368](https://github.com/assistant-ui/assistant-ui/pull/4368) [`7cadd89`](https://github.com/assistant-ui/assistant-ui/commit/7cadd89576ea47523bd495276838d57ab33a1f1d) - feat: initial `@assistant-ui/react-pi` MVP — a Pi coding-agent runtime adapter ([@AVGVSTVS96](https://github.com/AVGVSTVS96))
  - `usePiRuntime` + selector hooks (`usePiRuntimeExtras`, `usePiSession`,
    `usePiThreadState`, `usePiHostUiRequests`): thread list, streaming
    text/reasoning/tool output, mid-run steer/follow-up via Pi's native queue
    (mirrored as composer queue items with `clearQueue` restore-to-composer
    support), per-thread model/thinking controls, context usage, and Pi's
    blocking host-UI (approval) surface projected as native
    approvals/interrupts.
  - Browser-safe core: JSON-safe `PiClient` contract (`types`), pure
    snapshot-authoritative reducer (`reducePiThreadState`), pure transcript
    projection, and `PiThreadController` with optimistic echo, frame-coalesced
    stream notifications, and structural sharing of projected messages.
  - `createPiHttpClient` + SSE event source (`createSseDecoder` /
    `openPiEventStream`): the browser transport with snapshot-first reconnect.
  - `@assistant-ui/react-pi/node`: `createPiNodeClient` / `PiThreadSupervisor`,
    the process-singleton node host driving the Pi SDK — live `AgentSession`s for
    execution, read-only session-file snapshots for cold reads, and the
    `ExtensionUIContext` bridge for host-UI requests.

  See `examples/with-pi` for a complete Next.js wiring.
