---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: add `indicator` support to `MessagePrimitive.GroupedParts`.

Restores empty/loading-state handling that was dropped from the grouped renderer. `GroupedParts` now emits a synthetic `{ part: { type: "indicator", status } }` render call you handle with `case "indicator"` in your `switch (part.type)` — render loading dots, a "thinking…" placeholder, or nothing.

- New `indicator` prop controls when the slot fires: `"never"`, `"empty"` (no parts), `"no-text"` (default — last part isn't `text`/`reasoning`, e.g. the model ended on a tool call), or `"always"`. The default deliberately does **not** fire on truly empty messages.
- The indicator's `status` mirrors the message's running/complete/incomplete state (`requires-action` reads as running; the message-only `tool-calls` incomplete reason maps to `"other"`).
