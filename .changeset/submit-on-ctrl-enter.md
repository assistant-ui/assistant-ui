---
"@assistant-ui/react": patch
---

feat(ComposerInput): add submitMode prop

Add submitMode prop to ComposerInput with three options: "enter" (default), "ctrlEnter", and "none". This controls keyboard submission behavior - "ctrlEnter" mode allows plain Enter to insert newlines for easier multi-line message composition.

The existing submitOnEnter prop is now deprecated but still supported for backward compatibility.
