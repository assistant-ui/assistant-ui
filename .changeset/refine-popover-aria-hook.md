---
"@assistant-ui/react": patch
"@assistant-ui/react-lexical": patch
---

fix: omit `aria-expanded` from `unstable_useTriggerPopoverAriaProps` and `ComposerPrimitive.Input` so textbox inputs do not emit invalid ARIA attributes when a trigger popover is open
