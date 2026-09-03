---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

fix: leave math delimiters in code alone, and keep a fenced equation in its block

the bracket and tag rewrites ran over the whole text, so `\(x\)` inside a code span or a fence was rewritten before remark tokenized it and the rendered code stopped matching what the author wrote. both now skip code the way `escapeCurrencyDollars` already did.

a multi-line `[/math]` body was emitted as `$$` with its first line beside the marker, which remark-math reads as fence metadata and then scans to the end of the document for a closing marker, turning the rest of the reply into one parse error. it is fenced the same way a multi-line `\[…\]` body already was.

a fenced display body now carries the markdown prefix of the line it started on, so an equation inside a list item or a blockquote stays inside it instead of terminating the block.
