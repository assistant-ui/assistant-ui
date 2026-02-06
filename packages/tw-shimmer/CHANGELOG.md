# tw-shimmer

## 0.4.6

### Patch Changes

- a088518: chore: update dependencies

## 0.4.5

### Patch Changes

- d45b893: chore: update dependencies

## 0.4.4

### Patch Changes

- 605d825: chore: update dependencies

## 0.4.3

### Patch Changes

- 3719567: chore: update deps

## 0.4.2

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages

## 0.4.1

### Patch Changes

- e8ea57b: chore: update deps

## 0.4.0

### Minor Changes

- 308d3da: ### New Features
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

### Patch Changes

- 01c31fe: chore: update dependencies

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
