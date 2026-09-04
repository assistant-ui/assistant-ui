---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

fix: fence multiline [/math] bodies so remark-math finds the closing delimiter

a multiline `[/math]` body was emitted with its first line beside the opening `$$`, which remark-math reads as fence metadata before scanning to the end of the input for a closer, so the body's first line was lost and the rest of the reply rendered as one parse error. it is now fenced through the same emitter the bracket delimiters use.

a tag pair wrapping nothing is left as written, for the reason an empty bracket pair already was: `$$$$` opens a fence that never closes, and `$$` does the same inline.
