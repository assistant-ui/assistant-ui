---
"tw-shimmer": minor
---

### New Features

- Add `shimmer-bg` utility for skeleton loaders and background shimmer effects
- Add sine-eased gradients (17 stops) for smooth, banding-free shimmer highlights
- Add position sync utilities (`shimmer-x-*`, `shimmer-y-*`) for aligning angled shimmers across multiple elements
- Add `shimmer-angle-*` utility for diagonal shimmer sweeps
- Add `shimmer-container` with auto-width, auto-speed, and auto-spread heuristics:
  - Width-dependent pass duration (~1.1s at 320px → ~1.6s at 960px+)
  - Highlight spread scales with container width (clamped 200–300px)
- Introduce internal `--tw-shimmer-*-auto` variables so container-derived values act as fallbacks and any explicit `--shimmer-width`, `--shimmer-speed`, or `--shimmer-bg-spread` always override them

### Defaults

- Background shimmer: 800px width, 1000px/s speed
- Text shimmer: 200px width, 150px/s speed
