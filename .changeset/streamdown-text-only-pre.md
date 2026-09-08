---
"@assistant-ui/react-streamdown": patch
---

fix: keep spaces and line breaks in pre elements without code children

Raw blocks use the custom `components.pre` renderer when one is supplied.
