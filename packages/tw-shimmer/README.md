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

Add a direct inert clone to use the compositor path. The host text is the accessible label; the clone is only the highlight mask.

```html
<span class="shimmer text-foreground/40">
  Loading...
  <span class="shimmer-clone" aria-hidden="true" inert>Loading...</span>
</span>

<div class="shimmer-container space-y-2">
  <div class="shimmer-bg h-4 w-full rounded"></div>
  <div class="shimmer-bg h-4 w-3/4 rounded"></div>
</div>
```

Use this markup only for a one-line text box. The clone must be a direct child, and the host must have no padding, border, or other in-flow content.

Inside a `shimmer-container`, the plugin derives speed and width from the container size automatically.

The clone must be inert and hidden from assistive technology. Firefox and one-node markup use the paint fallback. Reduced motion stops the clone path.

## Utilities

| Utility                  | Effect                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| `shimmer`                | Base text shimmer. A direct clone uses the compositor path.                  |
| `shimmer-clone`          | Inert text copy for the compositor highlight mask.                            |
| `shimmer-bg`             | Background shimmer (skeleton placeholders).                                   |
| `shimmer-container`      | Parent container that auto-derives speed and width for children.              |
| `shimmer-speed-{value}`  | Animation speed in px per second. The text default is 200; background is 1000. |
| `--shimmer-track-width`  | Animation track width in px. The default is 200px.                            |
| `shimmer-spread-{value}` | Highlight thickness.                                                          |
| `shimmer-angle-{value}`  | Highlight angle in degrees.                                                   |
| `shimmer-color-{color}`  | Highlight color from your Tailwind palette.                                   |

Variables are inheritable; set them on any ancestor element and descendants pick them up unless they override.

## Documentation

Full utility reference, accessibility notes, and the technical details of the sine-eased gradient pipeline at [assistant-ui.com/tw-shimmer](https://www.assistant-ui.com/tw-shimmer).
