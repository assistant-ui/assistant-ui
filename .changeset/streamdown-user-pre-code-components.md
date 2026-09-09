---
"@assistant-ui/react-streamdown": patch
---

fix: render user `pre` and `code` components through the code adapter without remounting the code block on every render, and keep the element of a raw `<pre>` that has no `code` child
