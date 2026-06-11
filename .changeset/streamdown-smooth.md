---
"@assistant-ui/react-streamdown": patch
---

feat: `smooth` prop on `StreamdownTextPrimitive`

opt-in typewriter reveal via the now-public `useSmooth`, accepting `boolean | SmoothOptions`. the pipeline runs preprocess, then smooth, then the existing `defer` deferral, and `data-status`/`isAnimating` derive from the smooth status so the caret keeps blinking and the copy/download controls stay disabled until the reveal catches up. default off; streamdown's block memoization bounds the per-frame cost to linear string scans plus the tail block parse. the `@assistant-ui/react` peer floor moves to the release that ships `SmoothOptions`.
