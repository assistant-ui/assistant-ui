---
"assistant-ui": patch
---

`init`, `create` and `add` no longer pass along shadcn's note to wrap the layout in `TooltipProvider`, since assistant-ui components render their own. `init` also drops its line telling you to skip that note, so the output says one thing.
