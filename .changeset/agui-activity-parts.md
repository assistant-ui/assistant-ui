---
"@assistant-ui/react-ag-ui": patch
---

fix: an activity snapshot of a type the runtime does not render arrives as an `agui-activity/<type>` data part instead of being dropped, and an A2UI surface part carries the operations that rebuild it in its artifact
