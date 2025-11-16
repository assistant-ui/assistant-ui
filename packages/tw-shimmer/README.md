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
<span class="shimmer text-foreground/40">Loading...</span>
```

Use opacity (`/40`, `/50`, etc.) to make the shimmer effect visible.

## API

> [!NOTE]
> All values are unitless numbers with units auto-appended. For example, `shimmer-speed-50` applies 50px/s.

### `shimmer`

Base utility. Apply to any element with a text color.

```html
<span class="shimmer text-foreground/40">Loading...</span>
```

### `shimmer-speed-{value}`

Animation speed in pixels per second. Default: `100`px/s.

```html
<span class="shimmer shimmer-speed-200 text-foreground/40">Fast (200px/s)</span>
```

### `--shimmer-width-x`

CSS variable for container width in pixels used in speed calculations. Default: `200`px.

Set this at runtime to match your actual container width for accurate speed.

```tsx
<span class="shimmer" style={{ ["--shimmer-width-x" as string]: "300" }}>
  Wide container
</span>
```

Duration formula: `(width * 2) / speed`

### `shimmer-color-{color}`

Shimmer highlight color. Default: `currentColor`.

Uses Tailwind color palette.

```html
<span class="shimmer shimmer-color-blue-500 text-blue-500/40"
  >Blue highlight</span
>
```

### `shimmer-spread-{spacing}`

Width of the shimmer highlight. Default: `6`ch.

Uses Tailwind spacing scale.

```html
<span class="shimmer shimmer-spread-24 text-foreground/40">Wide highlight</span>
```

### `shimmer-angle-{degrees}`

Shimmer direction. Default: `90`deg.

```html
<span class="shimmer shimmer-angle-45 text-foreground/40"
  >Diagonal (45deg)</span
>
```

## License

MIT
