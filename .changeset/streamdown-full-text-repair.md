---
"@assistant-ui/react-streamdown": patch
---

fix: preserve text escapes and custom handler changes in earlier paragraphs without completing or deleting their unfinished Markdown.

Incomplete Markdown repair stays in the final block. Earlier blocks receive numeric-range escapes, comparison-operator escapes, and custom handlers. Custom handlers receive the earlier text and final block as separate strings.

`RemendConfig` gains `singleTilde` and `comparisonOperators`, so the two escapes that now reach settled text can be turned off without disabling incomplete-Markdown repair.
