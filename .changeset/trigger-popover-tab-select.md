---
"@assistant-ui/react": patch
---

fix(composer): select highlighted item on Tab in trigger popover

`ComposerPrimitive.Unstable_TriggerPopover` only accepted the highlighted entry on Enter. Tab fell through to the underlying textarea, moving focus out of the composer or inserting a tab character. This diverged from the autocomplete convention used in CLIs, IDEs, command palettes, GitHub, Slack, Discord, and Notion, where Tab accepts the highlighted suggestion.

Tab now mirrors Enter and selects the highlighted item or category. Shift+Tab still passes through so native focus traversal keeps working.
