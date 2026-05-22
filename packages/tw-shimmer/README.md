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

The text shimmer uses `background-clip: text`, so set a text color (typically with low opacity) on the base element:

```html
<span class="shimmer text-foreground/40">Loading...</span>

<div class="shimmer-container space-y-2">
  <div class="shimmer-bg h-4 w-full rounded"></div>
  <div class="shimmer-bg h-4 w-3/4 rounded"></div>
</div>
```

Inside a `shimmer-container`, the plugin derives speed and width from the container size automatically.

## Utilities

| Utility                  | Effect                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| `shimmer`                | Base text shimmer. Pair with a low-opacity text color.                        |
| `shimmer-bg`             | Background shimmer (skeleton placeholders).                                   |
| `shimmer-container`      | Parent container that auto-derives speed and width for children.              |
| `shimmer-speed-{value}`  | Animation speed in px per second (text: 150, background: 1000 by default).    |
| `shimmer-width-{value}`  | Animation track width in px (text: 200, background: 800 by default).          |
| `shimmer-spread-{value}` | Highlight thickness.                                                          |
| `shimmer-angle-{value}`  | Highlight angle in degrees.                                                   |
| `shimmer-color-{color}`  | Highlight color from your Tailwind palette.                                   |

Variables are inheritable; set them on any ancestor element and descendants pick them up unless they override.

## Documentation

Full utility reference, accessibility notes, and the technical details of the sine-eased gradient pipeline at [assistant-ui.com/tw-shimmer](https://www.assistant-ui.com/tw-shimmer).
