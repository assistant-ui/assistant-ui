# tw-shimmer - Agent Documentation

This document provides comprehensive context for AI agents working on the `tw-shimmer` package.

## Package Overview

**Purpose:** Tailwind CSS v4 plugin for shimmer effects (loading states, skeleton loaders).

**Status:** Released (v0.4.0) - Stable CSS-only plugin.

**Key Insight:** This package is **CSS-only with zero dependencies** - no JavaScript runtime. It provides Tailwind v4 utilities for text shimmer and background/skeleton shimmer effects.

## Features

- Zero-dependency, CSS-only shimmer effects
- **Sine-eased gradients** for smooth highlights with no banding (17 gradient stops)
- OKLCH color space for perceptually uniform color mixing
- Text shimmer (`shimmer`) and skeleton/background shimmer (`shimmer-bg`) variants
- Fully customizable speed, spread, angle, and colors
- Container-aware auto-sizing via `shimmer-container`

## Architecture

```
tw-shimmer
├── Pure CSS implementation (no JS)
├── Tailwind CSS v4 @utility directives
├── CSS custom properties for configuration
├── @property definitions for type-safe CSS variables
└── Container queries for auto-sizing
```

## File Map

```
packages/tw-shimmer/
├── src/
│   └── index.css          # All shimmer utilities and animations
├── package.json           # Package config (exports ./src/index.css)
├── README.md              # User documentation
├── CHANGELOG.md           # Version history
└── AGENTS.md              # This file
```

## Key Implementation Details

### 1. CSS Custom Properties

The shimmer effect is controlled via inheritable CSS variables:

| Variable | Default (text) | Default (bg) | Description |
|----------|----------------|--------------|-------------|
| `--shimmer-speed` | `200` | `1000` | Animation speed in px/s |
| `--shimmer-spread` | `4ch + 80px` | `480px` | Highlight width |
| `--shimmer-color` | `currentColor` | `currentColor` | Highlight color |
| `--shimmer-angle` | `15deg` | `15deg` | Sweep direction |
| `--shimmer-track-width` | `200px` | `800px` | Container width for timing |
| `--shimmer-duration` | calculated | calculated | Override auto duration |
| `--shimmer-repeat-delay` | calculated | calculated | Delay between passes |

### 2. Utility Classes

| Utility | Description |
|---------|-------------|
| `shimmer` | Base text shimmer (uses `background-clip: text`) |
| `shimmer-bg` | Background shimmer for skeletons |
| `shimmer-container` | Container with auto width/speed/spread |
| `shimmer-speed-{value}` | Set speed in px/s |
| `shimmer-spread-{value}` | Set highlight width in px |
| `shimmer-angle-{value}` | Set angle in degrees |
| `shimmer-color-{color}` | Set highlight color (Tailwind palette) |
| `shimmer-duration-{value}` | Override duration in ms |
| `shimmer-repeat-delay-{value}` | Set repeat delay in ms |
| `shimmer-invert` | Invert shimmer for dark/light backgrounds |
| `shimmer-x-{value}` / `shimmer-y-{value}` | Position hints for angled sync |

### 3. Gradient Implementation (src/index.css)

The shimmer uses a **17-stop sine-eased gradient** for smooth transitions:

```css
/* Gradient stops follow sine ease-in-out curve */
--_mix-96: color-mix(in oklch, var(--_fg), var(--_bg) 96%);
--_mix-83: color-mix(in oklch, var(--_fg), var(--_bg) 83%);
/* ... 17 total stops ... */

background: linear-gradient(
  calc(90deg + var(--shimmer-angle)),
  var(--_bg) calc(var(--_position) - var(--_spread) * 0.5),
  var(--_mix-96) calc(var(--_position) - var(--_spread) * 0.44),
  /* ... sine curve positions ... */
);
```

### 4. Animation Timing

Duration is calculated from track width and speed:

```css
--_active-distance: calc(var(--shimmer-track-width, 200px) + var(--_gradient-width));
--_duration: var(--shimmer-duration, calc(var(--_active-distance) / var(--_speed) / 1px * 1000));
```

The animation moves the gradient via `background-position`:

```css
@keyframes tw-shimmer {
  from {
    background-position: 100% 0;
  }
}
```

### 5. shimmer-container Auto-Sizing

Uses CSS container queries (`cqw` units) for automatic width detection:

```css
@utility shimmer-container {
  container-type: inline-size;

  & .shimmer {
    --shimmer-track-width: 100cqw;
    --shimmer-track-height: max(100cqh, 50cqw, 200px);
  }
}
```

**Limitation:** `container-type: inline-size` prevents shrink-to-fit sizing - not suitable for text-only containers.

### 6. Dark Mode Support

Automatic color adjustments for dark mode via `@variant dark`:

```css
@variant dark {
  &:not(.shimmer-bg) {
    --_fg: var(--shimmer-color, oklch(from currentColor max(0.8, calc(l + 0.4)) c h / calc(alpha + 0.4)));
  }
  &.shimmer-bg {
    --_fg: var(--shimmer-color, oklch(from currentColor 0 c h / 0.30));
  }
}
```

## Usage Patterns

### Basic Text Shimmer

```html
<span class="shimmer text-foreground/40">Loading...</span>
```

### Skeleton Loader

```html
<div class="shimmer-container flex gap-3">
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg bg-muted h-4 w-24 rounded" />
    <div class="shimmer-bg bg-muted h-4 w-full rounded" />
  </div>
</div>
```

### Customized Shimmer

```html
<span class="shimmer shimmer-speed-200 shimmer-angle-45 shimmer-color-blue-500 text-blue-500/40">
  Fast diagonal blue shimmer
</span>
```

## Browser Support

Requires modern CSS features:
- `oklch` and `color-mix` (Chrome 111+, Firefox 113+, Safari 16.4+)
- `translate` as independent transform
- Container queries for `shimmer-container`

Older browsers degrade gracefully.

## Key Invariants

1. **CSS-only** - No JavaScript runtime, all effects are pure CSS
2. **Tailwind v4** - Uses `@utility` and `@theme inline` directives
3. **Inheritable variables** - Parent values cascade to children
4. **Text shimmer requires opacity** - Use `text-foreground/40` for visible effect
5. **shimmer-bg needs bg color** - Use `bg-muted` or similar for base color
6. **Angle edge cases** - Avoid 0deg and 180deg (causes extreme tangent values)

## Testing

The package has demo pages at:
- `apps/docs/app/tw-shimmer/page.tsx` - Main demo
- `apps/docs/app/tw-shimmer/spread-test/page.tsx` - Spread testing

## Dependencies

- **Peer dependency:** `tailwindcss >=4.0.0-0`
- **No runtime dependencies**
