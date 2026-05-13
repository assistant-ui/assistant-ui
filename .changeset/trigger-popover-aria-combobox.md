---
"@assistant-ui/react": patch
---

fix(composer): apply WAI-ARIA combobox attributes to the textarea while a trigger popover is open

`Unstable_TriggerPopover` rendered the listbox half of the WAI-ARIA editable combobox pattern, but the focused element (the textarea) lacked the corresponding combobox attributes. screen readers had no way to announce that an autocomplete was open or which item was highlighted.

`ComposerPrimitive.Input` now reads the active popover descriptor from `TriggerPopoverRoot` and applies `aria-controls`, `aria-expanded`, `aria-haspopup="listbox"`, and `aria-activedescendant` to the textarea while a popover is open. attributes are removed when the popover closes. consumers using `ComposerPrimitive.Input` outside a `TriggerPopoverRoot` are unaffected.
