---
"@assistant-ui/react-streamdown": patch
---

perf: repair only the trailing block of streaming markdown instead of the whole message

`StreamdownTextPrimitive` let Streamdown run `remend` (incomplete-markdown repair) over the entire accumulated message on every streaming flush, which grows with the message. It now repairs only the last top-level block (the only place a dangling opener can be, since inline constructs cannot cross a blank line and blocks are split after repair), which is render-equivalent but avoids re-scanning the whole message each flush. `tailBoundedRemend` and `findRemendWindowStart` are exported so you can apply the same windowing yourself. Custom `remend` options are honored, and `parseIncompleteMarkdown={false}` still disables repair entirely.
