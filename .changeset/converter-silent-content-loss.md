---
"@assistant-ui/react-generative-ui": patch
---

fix: report the content the Slack and Teams converters were discarding silently. A non-item `ListView` child, a non-card child of a nested `Carousel`, a malformed `Select` or `RadioGroup` option, and a Slack table column that is not an object all warn `dropped` now. A dropped Slack column also keeps its position so the header stays aligned with the data, and a discarded Teams `ListView` child no longer reserves an input id that renames a control which survives
