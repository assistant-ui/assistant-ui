# `tw-glass`

[![npm version](https://img.shields.io/npm/v/tw-glass)](https://www.npmjs.com/package/tw-glass)
[![npm downloads](https://img.shields.io/npm/dm/tw-glass)](https://www.npmjs.com/package/tw-glass)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Tailwind CSS v4 plugin for glass refraction effects. Pure CSS, no JavaScript. Uses inline SVG displacement maps with `filterUnits="objectBoundingBox"` so refraction scales with element size automatically.

## Installation

```bash
npm install tw-glass
```

```css
@import "tw-glass";
```

Requires Tailwind CSS v4+.

## Usage

```html
<div class="glass rounded-xl p-6">Refracted backdrop</div>
<div class="glass glass-surface glass-strength-30 rounded-xl p-6">Frosted panel</div>
<h1 class="glass-text" style="background-image: url(photo.jpg); background-attachment: fixed">
  Glass heading
</h1>
```

Pair `glass` with `glass-surface` for a frosted-panel look, or layer on strength, chromatic, and backdrop utilities for stronger effects.

## Utilities

| Utility                                     | Effect                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `glass`                                     | Base refraction. Apply to any element with content behind it.           |
| `glass-surface`                             | Adds a frosted-panel background tint.                                   |
| `glass-strength-{5,10,20,30,40,50}`         | Displacement intensity.                                                 |
| `glass-chromatic-{5,10,20,30,40,50}`        | RGB channel split for a prism effect.                                   |
| `glass-blur-{n}`                            | Backdrop blur in px (default 2).                                        |
| `glass-saturation-{n}`                      | Backdrop saturation in % (default 120).                                 |
| `glass-brightness-{n}`                      | Backdrop brightness in % (default 105).                                 |
| `glass-bg-{n}`                              | Frosted-surface overlay opacity in % (default 8).                       |
| `glass-text`                                | Clip a background image to the text shape.                              |

## Browser support

Works in all browsers that support `backdrop-filter` with SVG filter references (Chrome, Edge, Safari, Firefox).

## Documentation

Live demo and full reference at [assistant-ui.com/tw-glass](https://www.assistant-ui.com/tw-glass).
