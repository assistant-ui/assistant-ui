---
"@assistant-ui/docs-theme": patch
---

perf: use the focused Farming Labs configuration entry to avoid loading server modules when configuring the documentation theme. Align the theme with Farming Labs Docs and Theme 0.2.135, which also avoid raw Markdown parser startup for MDX tree helpers and defer the built-in command-search dialog until first use.
