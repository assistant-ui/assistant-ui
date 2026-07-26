---
"@assistant-ui/tap": patch
---

Stop shipping react-shim declaration files the exports map disclaims — the shim subpaths are now genuinely untyped in every resolution mode instead of accidentally typed via TypeScript's fallback resolution.
