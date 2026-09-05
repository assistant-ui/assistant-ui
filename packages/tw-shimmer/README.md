# `tw-shimmer`

[![npm version](https://img.shields.io/npm/v/tw-shimmer)](https://www.npmjs.com/package/tw-shimmer)
[![npm downloads](https://img.shields.io/npm/dm/tw-shimmer)](https://www.npmjs.com/package/tw-shimmer)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Tailwind CSS v4 plugin for shimmer effects. Zero-dependency, CSS-only, with sine-eased gradients for buttery-smooth highlights and OKLCH color space for perceptually uniform color mixing. Provides text-shimmer and skeleton/background-shimmer variants with customizable speed, spread, angle, and colors.

## Installation

```bash
npm install tw-shimmer
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-shimmer";
```

## Usage

Text shimmer keeps one text node. Where `-webkit-mask-clip: text` is supported, the host is masked and an additive highlight band moves on the compositor. Other browsers keep the existing gradient fallback.

```html
<span class="shimmer text-foreground/40">Loading...</span>

<div class="shimmer-container space-y-2">
  <div class="shimmer-bg h-4 w-full rounded"></div>
  <div class="shimmer-bg h-4 w-3/4 rounded"></div>
</div>
```

Inside a `shimmer-container`, the plugin derives the track width from the container size automatically. Text shimmer hosts should contain text only: the host mask clips every descendant, including icons. Selection backgrounds are clipped to the glyphs on the compositor path.

The compositor highlight is additive. It defaults to white and `--shimmer-color`, including `shimmer-color-*`, overrides the band color. This matches the gradient on white and dark surfaces but can look different on tinted surfaces. `shimmer-invert` selects a black band.

Text shimmer holds still under `prefers-reduced-motion: reduce` on both paths, leaving the label in its plain text color. `shimmer-bg` keeps animating.

## Utilities

| Utility                  | Effect                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| `shimmer`                | Base text shimmer. Pair with a low-opacity text color.                        |
| `shimmer-bg`             | Background shimmer (skeleton placeholders).                                   |
| `shimmer-container`      | Parent container that auto-derives speed and width for children.              |
| `shimmer-speed-{value}`  | Animation speed in px per second (text: 200, background: 1000 by default).    |
| `--shimmer-track-width`  | Animation track width for timing (text: 200px by default).                    |
| `shimmer-spread-{value}` | Highlight thickness.                                                          |
| `shimmer-angle-{value}`  | Highlight angle in degrees.                                                   |
| `shimmer-color-{color}`  | Highlight color from your Tailwind palette.                                   |
| `shimmer-invert`         | Use a contrasting additive highlight band.                                    |

Variables are inheritable; set them on any ancestor element and descendants pick them up unless they override. The same speed, duration, repeat delay, angle, and track width drive both rendering paths.

## Documentation

Full utility reference, accessibility notes, and the technical details of the sine-eased gradient pipeline at [assistant-ui.com/tw-shimmer](https://www.assistant-ui.com/tw-shimmer).
