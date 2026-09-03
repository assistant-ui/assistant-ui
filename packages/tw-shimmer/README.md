# `tw-shimmer`

[![npm version](https://img.shields.io/npm/v/tw-shimmer)](https://www.npmjs.com/package/tw-shimmer)
[![npm downloads](https://img.shields.io/npm/dm/tw-shimmer)](https://www.npmjs.com/package/tw-shimmer)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Tailwind CSS v4 plugin for shimmer effects. The plugin has no dependencies and uses CSS only. You can change the speed, spread, angle, and colors.

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

Add a direct inert clone to use the compositor path. The host text is the accessible label. The clone is only the highlight mask.

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

Use this markup only for a one-line text box. The box must have no padding, border, or other in-flow content.

Inside a `shimmer-container`, the plugin calculates the speed and width from the container size.

The clone must be inert and hidden from assistive technology. Firefox and one-node markup use the paint fallback. Reduced motion stops the clone path.

## Utilities

| Utility                  | Effect                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| `shimmer`                | Base text shimmer. A direct clone uses the compositor path.             |
| `shimmer-clone`          | Inert text copy for the compositor highlight mask.                      |
| `shimmer-bg`             | Background shimmer for skeleton placeholders.                          |
| `shimmer-container`      | Parent container that calculates the speed and width for its children.  |
| `shimmer-speed-{value}`  | Animation speed in px/s. The text default is 200 and the background is 1000. |
| `--shimmer-track-width`  | Track width variable for timing. The default is `200px`.                |
| `shimmer-spread-{value}` | Highlight thickness.                                                    |
| `shimmer-angle-{value}`  | Highlight angle in degrees.                                             |
| `shimmer-color-{color}`  | Highlight color from the Tailwind palette.                              |

The variables pass to child elements. Set them on a parent element to change its shimmer children.

## Documentation

The [tw-shimmer documentation](https://www.assistant-ui.com/tw-shimmer) gives the full utility reference and the accessibility information.