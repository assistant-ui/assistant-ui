---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: guard `navigator.clipboard` availability and swallow write rejections in `ActionBarPrimitive.Copy`. Previously, copy clicks in SSR, non-HTTPS contexts, or older browsers without the Clipboard API threw a `ReferenceError`, and permission-denied rejections surfaced as unhandled promise rejections. The web copyToClipboard implementation in `@assistant-ui/react` now early-rejects when the API is unavailable, and `useActionBarCopy` in `@assistant-ui/core` silently absorbs the rejection so the rest of the UI is unaffected.
