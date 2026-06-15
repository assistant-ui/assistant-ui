---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

feat: export math-delimiter preprocess helpers for the markdown text primitives

adds `normalizeMathDelimiters`, `rewriteLatexBracketDelimiters`, `rewriteCustomMathTags`, and `escapeCurrencyDollars` so you can pass them to the `preprocess` prop instead of copy-pasting a regex blob. they rewrite the `\(...\)` / `\[...\]` brackets and `[/math]` / `[/inline]` tags that models emit to the `$...$` / `$$...$$` form remark-math parses, and escape `$5`-style currency so single-dollar math doesn't eat it.
