---
"@assistant-ui/react-markdown": patch
---

render a one-equation `\[...\]` or `[/math]...[/math]` display whose delimiters sit on lines of their own as display math, in every block context, instead of collapsing it to a one-line `$$...$$` that remark-math parses as inline math; a display whose delimiter shares its line with prose or a code span stays on one span
