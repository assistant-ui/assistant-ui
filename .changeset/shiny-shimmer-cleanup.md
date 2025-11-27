---
"tw-shimmer": minor
---

### New Features

- Added `shimmer-bg` utility for non-text elements, like skeleton states
- Added `--shimmer-bg-x` / `--shimmer-bg-y` CSS variables for pixel-perfect diagonal animation sync

### Breaking Changes

- Renamed CSS variable `--shimmer-width-x` → `--shimmer-width`
- Shimmer gradients now use 13 sine-eased stops (previously 3 linear stops)
- Default shimmer colors now use OKLCH with 80% opacity (previously solid black/white)
