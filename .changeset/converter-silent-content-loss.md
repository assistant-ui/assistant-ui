---
"@assistant-ui/react-generative-ui": patch
---

fix: report the content the Slack and Teams converters were discarding silently. A `ListView` or `Carousel` child that would have rendered, a malformed `Select` or `RadioGroup` option, and a table column without a string label all warn `dropped` now, while a child that renders nothing anyway stays silent. A Slack column without a label also keeps its position now, so the header stays aligned with the data, and a discarded child no longer spends the shared markdown and data-table budgets or reserves a Teams input id that renames a control which survives
