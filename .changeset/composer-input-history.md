---
"@assistant-ui/react": patch
---

feat: `unstable_useComposerInputHistory`

terminal-style input history for the thread composer: ArrowUp on an empty draft recalls previously sent user messages (newest first, derived live from thread state), ArrowDown steps back and finally restores the in-progress draft. spread the returned `{ onKeyDown }` bundle onto `ComposerPrimitive.Input`. yields to open trigger popovers, IME composition, modifiers, selections, and consumer handlers that already prevented the event; inert on edit composers.
