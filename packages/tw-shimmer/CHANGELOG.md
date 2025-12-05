# tw-shimmer

## 0.3.0

### Minor Changes

- Add `shimmer-bg` utility for skeleton loaders and background shimmer effects
- Add sine-eased gradients for smooth, banding-free shimmer highlights
- Add position sync utilities (`shimmer-x-*`, `shimmer-y-*`) for aligning angled shimmers across multiple elements
- Add `shimmer-angle-*` utility for diagonal shimmer sweeps
- Add internal variable system (`--tw-shimmer-*`) derived from public `--shimmer-*` variables with sensible defaults
- Add `shimmer-container` auto-speed and auto-spread heuristics for `shimmer-bg` so that shimmer passes use a width-dependent pass time (~1.1–1.6s) and highlight spread scales with container width (clamped between ~200px and 300px, or the track width if smaller)
- Introduce internal `--tw-shimmer-*-auto` variables for width and speed so that container-derived values act as fallbacks and any explicit `--shimmer-width`, `--shimmer-speed`, or `--shimmer-bg-spread` (from utilities or inline styles) always override them, even inside `shimmer-container`
- Background shimmer defaults: 800px width, 1000px/s speed
- Text shimmer defaults: 200px width, 150px/s speed

## 0.2.1

### Patch Changes

- 2c33091: chore: update deps

## 0.2.0

### Minor Changes

- fa5c757: Fix Firefox support - convert shimmer-width-x to unitless
