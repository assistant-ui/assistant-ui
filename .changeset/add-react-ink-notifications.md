---
"@assistant-ui/react-ink": patch
---

add a `useNotification` hook plus `ringBell` / `sendOSCNotification` helpers to `@assistant-ui/react-ink`. the hook rings the terminal bell and emits an OSC desktop notification when the assistant finishes a run, stops with an error, or pauses for human approval (`requires-action` with `reason: "interrupt"` only; tool-call pauses are skipped). pass `useNotification()` for the default bell-on-every-transition behavior, `useNotification({ onTaskComplete: false })` to suppress one trigger, or `useNotification({ onTaskComplete: { custom: (event) => ... } })` for a user-supplied callback. transitions are derived from `useAuiState` so deprecated `thread.runStart` / `thread.runEnd` events are not relied on. `ringBell` and `sendOSCNotification` are also exported for imperative use.
