---
"assistant-ui": patch
---

`init` no longer tells you to skip shadcn's note about wrapping the layout in `TooltipProvider` right after passing that note along. It now says the note applies only if you use shadcn's `Tooltip` directly, since assistant-ui components render their own provider.
