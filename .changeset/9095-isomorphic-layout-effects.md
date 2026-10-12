---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
"@assistant-ui/react-ag-ui": patch
---

fix: run layout effects through `useIsomorphicLayoutEffect` so React 18 server renders stop warning, while Ink keeps its layout phase
