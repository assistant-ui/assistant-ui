---
"@assistant-ui/vite": patch
---

feat: add @assistant-ui/vite — a Vite plugin (`aui()`) that compiles the `"use generative"` directive for Vite apps and TanStack Start. It transforms each toolkit per Vite environment (`client` keeps `render`, server environments keep `execute`), so no facade/redirect is needed; it also skips the Next-only `server-only` import, which has no `react-server` layer under Vite.
