---
"@assistant-ui/react": patch
---

fix(composer): sync mouse hover with keyboard highlight in `TriggerPopover`. Items and categories now update `highlightedIndex` on mouse move, keeping `data-highlighted`, `aria-selected`, and `aria-activedescendant` consistent with the hovered element. A new `highlightIndex(index)` method is exposed on the popover scope. Closes #3868.
