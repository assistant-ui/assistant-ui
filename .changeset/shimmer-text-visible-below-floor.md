---
"tw-shimmer": patch
---

fix: keep shimmer text readable below the browser floor

`shimmer` clipped the background to the text and set `-webkit-text-fill-color: transparent` unconditionally. Below the feature floor the gradient is invalid at computed value time and falls back to `none`, but the transparent fill stayed, so the label rendered as nothing.

Both declarations now sit behind `@supports (color: oklch(from red l c h))`. Relative color syntax landed alongside `@property` and `tan()` in every engine (Chrome 119, Firefox 128, Safari 16.4), so the one gate covers every feature the gradient needs. Outside the gate the element keeps its normal fill and renders as plain static text, which is what the docs promise.
