---
"tw-shimmer": patch
---

perf: run the text shimmer on the compositor without duplicate markup

where `-webkit-mask-clip: text` is supported the host is masked and an additive band moves on `translate`, so a shimmering label no longer repaints its glyphs every frame; other browsers keep the gradient fallback. the band travels the same distance as the fallback, so `shimmer-speed`, `shimmer-duration`, `shimmer-repeat-delay`, `shimmer-angle`, and `shimmer-container` produce the same sweep on both paths. it defaults to white and takes `--shimmer-color`, `shimmer-color-*`, and `shimmer-invert`, which matches the fallback on white and dark surfaces and can differ on tinted ones. the host mask clips every descendant, so a text shimmer host must contain text only. text shimmer now holds still under `prefers-reduced-motion: reduce` on both paths; `shimmer-bg` is unchanged.
