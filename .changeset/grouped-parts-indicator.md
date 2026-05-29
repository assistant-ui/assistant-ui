---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: add `indicator` support to `MessagePrimitive.GroupedParts`.

Restores loading-state handling that was dropped from the grouped renderer. `GroupedParts` now emits a synthetic `{ part: { type: "indicator" } }` render call you handle with `case "indicator"` in your `switch (part.type)` — render a "thinking…" dot or any loading affordance.

- The indicator is only ever emitted while the message is **running**, so its presence alone means "render loading UI here" — there's no `status` to branch on.
- New `indicator` prop restricts which running states qualify: `"never"`, `"empty"` (no parts yet), `"no-text"` (default — last part isn't `text`/`reasoning`, e.g. the model ended on a tool call), or `"always"` (any running state).
