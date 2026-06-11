---
"@assistant-ui/react": patch
"@assistant-ui/react-markdown": patch
---

feat: public, tunable `useSmooth`

`useSmooth` and a new `SmoothOptions` type are now exported from `@assistant-ui/react` (previously internal-only with a hard-coded reveal rate). the `smooth` prop on `MessagePartPrimitive.Text` and `MarkdownTextPrimitive` widens to `boolean | SmoothOptions`, with `drainMs` (backlog drain target, default 250), `maxCharIntervalMs` (slowest reveal interval, default 5), and `maxCharsPerFrame` (per-frame cap, default unlimited). the hook also now preserves the part type for reasoning parts instead of always returning `type: "text"`. react-markdown's `@assistant-ui/react` peer floor moves to the release that ships `SmoothOptions`.
