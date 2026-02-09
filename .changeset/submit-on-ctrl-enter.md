---
"@assistant-ui/react": patch
---

feat(ComposerInput): add submitMode prop

Add submitMode prop to ComposerInput with two options: "enter" (default) and "ctrlEnter". This controls keyboard submission behavior - "ctrlEnter" mode allows plain Enter to insert newlines for easier multi-line message composition.

The existing submitOnEnter prop is now deprecated but still supported for backward compatibility.
