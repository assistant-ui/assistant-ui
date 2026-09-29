---
"@assistant-ui/react-generative-ui": patch
---

fix: isolate radio selections across generated cards while preserving logical field names in form submissions and action references.

Rendered component trees and arrays returned by `renderGenerativeUI` now sit inside a context provider. Null and primitive results retain their original shape.
