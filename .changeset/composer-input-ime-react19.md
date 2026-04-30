---
"@assistant-ui/react": patch
---

fix(react): recover ComposerPrimitive.Input from dropped compositionend

reset `compositionRef` when the next change event reports `isComposing: false` so a dropped `compositionend` (chromium dead-key layouts, mid-composition focus loss) can no longer freeze the input. additionally call `setText` during composition so React 19's stricter controlled-input reconciliation does not reset the textarea mid-IME. fixes #3923.
