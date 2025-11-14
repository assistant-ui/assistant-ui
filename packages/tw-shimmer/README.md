# tw-shimmer

Tailwind CSS v4 plugin for shimmer effects.

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

The shimmer effect uses `background-clip: text`, so you need to set a text color for the base text:

```html
<div class="shimmer text-foreground/40">Loading...</div>
```

Use opacity (`/40`, `/50`, etc.) to make the shimmer effect visible.

## API

### `shimmer`

Base utility. Apply to any element with a text color.

```html
<div class="shimmer text-foreground/40">Loading...</div>
```

### `shimmer-speed-{value}`

Animation speed in pixels per second. Default: `100px/s`.

Values are unitless numbers (units auto-appended): `50`, `100`, `150`, `200`, etc.

```html
<div class="shimmer shimmer-speed-200 text-foreground/40">Fast (200px/s)</div>
```

### `--shimmer-width-x`

CSS variable for container width used in speed calculations. Default: `200px`.

Set this at runtime to match your actual container width for accurate speed.

```tsx
<div class="shimmer" style={{ ["--shimmer-width-x" as string]: "300px" }}>
  Wide container
</div>
```

Duration formula: `(width * 2) / speed`

### `shimmer-color-{color}`

Shimmer highlight color. Default: `currentColor`.

Uses Tailwind color palette.

```html
<div class="shimmer shimmer-color-blue-500 text-blue-500/40">Colored</div>
```

### `shimmer-spread-{spacing}`

Width of the shimmer highlight. Default: `6ch`.

Uses Tailwind spacing scale.

```html
<div class="shimmer shimmer-spread-12 text-foreground/40">Wide highlight</div>
```

### `shimmer-angle-{degrees}`

Shimmer direction. Default: `90deg`.

Values are unitless numbers (deg auto-appended): `0`, `45`, `90`, `180`, etc.

```html
<div class="shimmer shimmer-angle-45 text-foreground/40">Diagonal (45deg)</div>
```

## License

MIT
