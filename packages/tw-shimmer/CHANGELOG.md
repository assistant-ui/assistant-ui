# tw-shimmer

## 0.3.0

### Minor Changes

- Add `shimmer-bg` utility for skeleton loaders and background shimmer effects
- Add sine-eased gradients for smooth, banding-free shimmer highlights
- Add position sync utilities (`shimmer-x-*`, `shimmer-y-*`) for aligning angled shimmers across multiple elements
- Add `shimmer-angle-*` utility for diagonal shimmer sweeps
- Add internal variable system (`--tw-shimmer-*`) derived from public `--shimmer-*` variables with sensible defaults
- Background shimmer defaults: 600px width, 500px/s speed, 400px spread
- Text shimmer defaults: 200px width, 100px/s speed

### Patch Changes

- Add `overflow: hidden` fallback before `overflow: clip` for older browser compatibility

## 0.2.1

### Patch Changes

- 2c33091: chore: update deps

## 0.2.0

### Minor Changes

- fa5c757: Fix Firefox support - convert shimmer-width-x to unitless
