---
"@assistant-ui/react-pi": patch
---

feat: initial `@assistant-ui/react-pi` MVP — a Pi coding-agent runtime adapter

- `usePiRuntime` + selector hooks (`usePiRuntimeExtras`, `usePiSession`,
  `usePiThreadState`, `usePiHostUiRequests`): thread list, streaming
  text/reasoning/tool output, mid-run steer/follow-up via Pi's native queue,
  per-thread model/thinking controls, context usage, and Pi's blocking host-UI
  (approval) surface projected as native approvals/interrupts.
- Browser-safe core: JSON-safe `PiClient` contract (`piTypes`), pure
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
