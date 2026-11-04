---
"@assistant-ui/tap": patch
---

fix(tap): re-export every React 18 and 19 runtime export from `@assistant-ui/tap/react-shim` explicitly, so Vite dev's pre-bundled shim no longer drops named exports such as `Component` and `version` that `@assistant-ui/react` imports
