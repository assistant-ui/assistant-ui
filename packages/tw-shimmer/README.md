# tw-shimmer

Tailwind CSS v4 plugin for shimmer effects.

## Features

- Zero-dependency, CSS-only shimmer effects
- **Sine-eased gradients** for buttery-smooth highlights with no banding
- OKLCH color space for perceptually uniform color mixing
- Text shimmer and skeleton/background shimmer variants
- Fully customizable speed, spread, angle, and colors

## Why Sine-Eased Gradients?

Most shimmer effects use simple linear gradients that create visible "banding" - harsh edges where the highlight meets the background. We use [eased gradients](https://www.joshwcomeau.com/css/make-beautiful-gradients/) with **13-17 carefully calculated stops** following a sine ease-in-out curve.

This produces gradual transitions at both the center (peak brightness) and edges (fade to transparent), eliminating the banding that plagues typical shimmer implementations. The result is a shimmer that feels organic and polished.

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

Animation speed in pixels per second. Default: `100`px/s for text, `500`px/s for bg.

```html
<span class="shimmer shimmer-speed-200 text-foreground/40">Fast (200px/s)</span>
```

### `shimmer-width-{value}`

Container width in pixels for animation timing. Default: `200`px for text, `600`px for bg.

Set this to match your container width for consistent animation speed across different element sizes.

```tsx
<span class="shimmer shimmer-width-300 text-foreground/40">
  Wide container
</span>
```

Or set via CSS variable at runtime:

```tsx
<span class="shimmer" style={{ ["--shimmer-width" as string]: "300" }}>
  Wide container
</span>
```

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

Shimmer direction. Default: `90`deg. Shared with `shimmer-bg`.

```html
<span class="shimmer shimmer-angle-45 text-foreground/40"
  >Diagonal (45deg)</span
>
```

## Background Shimmer (Skeletons)

For skeleton loaders and non-text elements, use `shimmer-bg` instead:

### `shimmer-bg`

Background shimmer for skeleton loaders and non-text elements. Use standard Tailwind `bg-*` for base color.

```html
<div class="shimmer-bg bg-muted h-4 w-48 rounded" />
```

### Skeleton Example

Set `--shimmer-width` on the container to sync all children:

```tsx
<div class="flex gap-3" style={{ ["--shimmer-width" as string]: "600" }}>
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg bg-muted h-4 w-24 rounded" />
    <div class="shimmer-bg bg-muted h-4 w-full rounded" />
    <div class="shimmer-bg bg-muted h-4 w-4/5 rounded" />
  </div>
</div>
```

### `shimmer-highlight-{color}`

Customize the shimmer highlight color. Use with standard `bg-*` for base color.

```html
<div class="shimmer-bg bg-blue-300 shimmer-highlight-blue-100 h-4 w-48 rounded" />
```

### `shimmer-bg-spread-{value}`

Width of the shimmer highlight stripe in pixels. Default: `400`px.

```html
<div class="shimmer-bg bg-muted shimmer-bg-spread-200 h-4 w-48 rounded" />
```

### Angled Skeleton Shimmer

Use `shimmer-angle-{degrees}` (shared with text shimmer) for diagonal sweeps:

```tsx
<div class="flex gap-3 shimmer-angle-15" style={{ ["--shimmer-width" as string]: "600" }}>
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="shimmer-bg bg-muted h-4 w-full rounded" />
</div>
```

### `--shimmer-bg-x` / `--shimmer-bg-y`

Element's X and Y position relative to container (in pixels). Used with angled shimmers to create a unified diagonal sweep effect. The animation delay is calculated automatically.

- `--shimmer-bg-x`: Horizontal offset from container left
- `--shimmer-bg-y`: Vertical offset from container top (adjusted by `tan(90 - angle)`)

> **Tip:** For larger elements like avatars, use center coordinates instead of top-left for better alignment with the diagonal sweep.

```tsx
<div
  class="shimmer-angle-15"
  style={{ ["--shimmer-width" as string]: "600" }}
>
  <div
    class="shimmer-bg bg-muted size-10 rounded-full"
    style={{
      ["--shimmer-bg-x" as string]: "20",
      ["--shimmer-bg-y" as string]: "20",
    }}
  />
  <div
    class="shimmer-bg bg-muted h-4 w-24 rounded"
    style={{
      ["--shimmer-bg-x" as string]: "52",
      ["--shimmer-bg-y" as string]: "0",
    }}
  />
  <div
    class="shimmer-bg bg-muted h-4 w-full rounded"
    style={{
      ["--shimmer-bg-x" as string]: "52",
      ["--shimmer-bg-y" as string]: "24",
    }}
  />
</div>
```

## License

MIT
