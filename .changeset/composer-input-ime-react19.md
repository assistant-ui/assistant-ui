---
"@assistant-ui/react": patch
---

fix(react): keep CJK IME input alive on React 19 and recover stuck `compositionRef`

Two related fixes inside `ComposerPrimitive.Input` for users on React 19 with CJK (Korean, Japanese, Chinese) input methods:

1. **React 19 controlled input regression.** During an IME composition the `onChange` handler was returning early before calling `setText`, leaving the controlled `value` stale. React 19 reconciles controlled inputs more aggressively than 18 and would reset the textarea to the stale value mid-composition, causing in-progress characters to disappear (e.g. typing `가` showed nothing). The fix calls `setText` on every change so the controlled value tracks the DOM value, even while composing. Plugin cursor tracking still skips composing events, where the selection position is unstable.

2. **Stuck `compositionRef` recovery.** If `compositionend` was dropped by the browser (dead-key layouts, tab unfocus mid-composition, etc.), the internal `compositionRef` stayed `true` forever and silently swallowed every subsequent `onChange`, freezing the input. The handler now resets the ref whenever the native event reports `isComposing === false`, allowing the input to self-heal.

Fixes #3923.
