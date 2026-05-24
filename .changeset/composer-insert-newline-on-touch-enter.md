---
"@assistant-ui/react": patch
---

feat(react): `unstable_insertNewlineOnTouchEnter` on `ComposerPrimitive.Input`

When set, plain Enter on a touch-primary device — detected via the `(pointer: coarse) and (not (any-pointer: fine))` media query — inserts a newline instead of submitting. Messages then dispatch only via the explicit Send button, matching the chat-input convention used by WhatsApp, Slack, Discord, iMessage, ChatGPT, and Claude.ai, and avoiding the consumer-side caret-aware re-insertion dance the previous workaround required.

Orthogonal to `submitMode`: only takes effect when `submitMode` resolves to `"enter"` (the default). A tablet paired with a hardware keyboard can still submit via `submitMode="ctrlEnter"` (Cmd/Ctrl+Enter), and `submitMode="none"` is unchanged.

```tsx
<ComposerPrimitive.Input
  placeholder="Ask anything..."
  unstable_insertNewlineOnTouchEnter
/>
```

Stays `unstable_` until we have enough field signal to flip the behavior on by default.
