---
"@assistant-ui/react": patch
---

Fix loading the React entry point in Vite dev when the React shim does not forward the named `Component` and `version` exports.
