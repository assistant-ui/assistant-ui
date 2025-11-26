# tw-shimmer

Tailwind CSS v4 plugin for shimmer effects.

## Features

- Zero-dependency, CSS-only shimmer effects
- [Eased gradients](https://www.joshwcomeau.com/css/make-beautiful-gradients/) for smooth, natural-looking highlights
- OKLCH color space for perceptually uniform color mixing
- Text shimmer and skeleton/background shimmer variants
- Fully customizable speed, spread, angle, and colors

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

## Background Shimmer (Skeletons)

For skeleton loaders and non-text elements, use `shimmer-bg` instead:

### `shimmer-bg`

Background shimmer for skeleton loaders and non-text elements. No text color needed.

```html
<div class="shimmer-bg h-4 w-48 rounded" />
```

### `--shimmer-bg-travel`

CSS variable for container width in pixels. Set this on the container to sync all children.

```tsx
<div class="flex gap-3" style={{ ["--shimmer-bg-travel" as string]: "600" }}>
  <div class="shimmer-bg size-10 rounded-full" />
  <div class="shimmer-bg h-4 w-full rounded" />
</div>
```

Duration formula: `(travel + shimmer-width) / speed`

### `shimmer-bg-speed-{value}`

Animation speed in pixels per second. Default: `500`px/s.

```html
<div class="shimmer-bg shimmer-bg-speed-300 h-4 w-48 rounded" />
```

### `shimmer-bg-base-{color}` / `shimmer-bg-highlight-{color}`

Customize the base and highlight colors for skeleton shimmer.

```html
<div
  class="shimmer-bg shimmer-bg-base-blue-300 shimmer-bg-highlight-blue-100 h-4 w-48 rounded"
/>
```

### Skeleton Example

```tsx
<div class="flex gap-3" style={{ ["--shimmer-bg-travel" as string]: "600" }}>
  <div class="shimmer-bg size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg h-4 w-24 rounded" />
    <div class="shimmer-bg h-4 w-full rounded" />
    <div class="shimmer-bg h-4 w-4/5 rounded" />
  </div>
</div>
```

### `shimmer-bg-angle-{degrees}`

Shimmer angle in degrees. Default: `90` (horizontal).

```html
<div class="shimmer-bg shimmer-bg-angle-45 h-4 w-48 rounded" />
```

Or set on container via CSS variable to apply to all children:

```tsx
<div style={{ ["--shimmer-bg-angle" as string]: "45" }}>
  <div class="shimmer-bg h-4 w-48 rounded" />
</div>
```

### `shimmer-bg-width-{value}`

Width of the shimmer highlight stripe in pixels. Default: `400`px.

```html
<div class="shimmer-bg shimmer-bg-width-200 h-4 w-48 rounded" />
```

### `--shimmer-bg-x` / `--shimmer-bg-y`

Element's X and Y position relative to container (in pixels). Used with angled shimmers to create a unified diagonal sweep effect. The animation delay is calculated automatically.

- `--shimmer-bg-x`: Horizontal offset from container left
- `--shimmer-bg-y`: Vertical offset from container top (adjusted by `tan(90 - angle)`)

> **Tip:** For larger elements like avatars, use center coordinates instead of top-left for better alignment with the diagonal sweep.

```tsx
<div
  style={{
    ["--shimmer-bg-travel" as string]: "600",
    ["--shimmer-bg-angle" as string]: "15",
  }}
>
  <div
    class="shimmer-bg size-10 rounded-full"
    style={{
      ["--shimmer-bg-x" as string]: "20",
      ["--shimmer-bg-y" as string]: "20",
    }}
  />
  <div
    class="shimmer-bg h-4 w-24 rounded"
    style={{
      ["--shimmer-bg-x" as string]: "52",
      ["--shimmer-bg-y" as string]: "0",
    }}
  />
  <div
    class="shimmer-bg h-4 w-full rounded"
    style={{
      ["--shimmer-bg-x" as string]: "52",
      ["--shimmer-bg-y" as string]: "24",
    }}
  />
</div>
```

## License

MIT
