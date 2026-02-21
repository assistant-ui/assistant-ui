# tw-glass

Tailwind CSS v4 plugin for glass refraction effects. Pure CSS, no JavaScript.

Uses inline SVG displacement maps with `filterUnits="objectBoundingBox"` so refraction scales with element size automatically.

[Live demo & docs](https://www.assistant-ui.com/tw-glass)

## Installation

```sh
npm install tw-glass
```

Import in your CSS:

```css
@import "tw-glass";
```

Requires Tailwind CSS v4+.

## Usage

### Glass refraction

Add `glass` to any element with content behind it:

```html
<div class="glass rounded-xl p-6">
  Content with refracted backdrop
</div>
```

Pair with `glass-surface` for a frosted panel look:

```html
<div class="glass glass-surface rounded-xl p-6">
  Frosted glass panel
</div>
```

### Refraction strength

Control displacement intensity:

```html
<div class="glass glass-strength-5">Subtle</div>
<div class="glass glass-strength-20">Default</div>
<div class="glass glass-strength-50">Heavy</div>
```

Available: `glass-strength-5`, `10`, `20`, `30`, `40`, `50`.

### Chromatic aberration

Split RGB channels for a prism effect:

```html
<div class="glass glass-chromatic-10">Prismatic</div>
```

Available: `glass-chromatic-5`, `10`, `20`, `30`, `40`, `50`.

### Backdrop tuning

Fine-tune blur, saturation, and brightness:

```html
<div class="glass glass-blur-4 glass-saturation-150 glass-brightness-110">
  Custom backdrop
</div>
```

- `glass-blur-{n}` -- blur in px (default: 2)
- `glass-saturation-{n}` -- percentage (default: 120)
- `glass-brightness-{n}` -- percentage (default: 105)

### Surface opacity

Control the frosted surface background opacity:

```html
<div class="glass glass-surface glass-bg-12">
  12% white overlay
</div>
```

`glass-bg-{n}` sets opacity as percentage (default: 8).

### Glass text

Clip a background image to the text shape:

```html
<h1
  class="glass-text"
  style="background-image: url(photo.jpg); background-attachment: fixed"
>
  Glass heading
</h1>
```

## Browser support

Works in all browsers that support `backdrop-filter` with SVG filter references (Chrome, Edge, Safari, Firefox).

## License

MIT
