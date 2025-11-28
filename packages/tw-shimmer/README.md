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

Any performance impact is negligible given the gradient is rendered and accelerated as a texture on the GPU.

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

`--shimmer-speed` is inheritable:

- If you set `--shimmer-speed` (or use `shimmer-speed-{value}`) on a parent container, both `shimmer` and `shimmer-bg` children will use that value unless they override it.
- If no value is set anywhere, text shimmer falls back to `100` and background shimmer falls back to `500`.

```html
<span class="shimmer shimmer-speed-200 text-foreground/40">Fast (200px/s)</span>
```

### `shimmer-width-{value}`

Container width in pixels for animation timing. Default: `200`px for text, `600`px for bg.

`--shimmer-width` is inheritable:

- If you set `--shimmer-width` (or use `shimmer-width-{value}`) on a parent container, both `shimmer` and `shimmer-bg` children will use that value unless they override it.
- If no value is set anywhere, text shimmer falls back to `200` and background shimmer falls back to `600`.

Set this to match your container width for consistent animation speed across different element sizes.

```tsx
<span class="shimmer shimmer-width-300 text-foreground/40">Wide container</span>
```

Or set via CSS variable at runtime:

```tsx
<span class="shimmer" style={{ ["--shimmer-width" as string]: "300" }}>
  Wide container
</span>
```

### `shimmer-color-{color}`

Shimmer highlight color. Default: `black` for text (white in dark mode), `white` for bg.

`--shimmer-color` is shared and inheritable:

- If you set `--shimmer-color` (or use `shimmer-color-{color}`) on a parent container, any `shimmer` or `shimmer-bg` elements inside will use that color unless they define their own.
- If no value is set anywhere, text shimmer falls back to black in light mode (and white in dark mode), and background shimmer falls back to white (with a subtler default in dark mode).

Uses the Tailwind color palette.

```html
<span class="shimmer shimmer-color-blue-500 text-blue-500/40"
  >Blue highlight</span
>
```

### `shimmer-spread-{spacing}`

Width of the shimmer highlight for text shimmer. Default: `6`ch.

`--shimmer-spread` is inheritable:

- If you set `--shimmer-spread` (or use `shimmer-spread-{spacing}`) on a parent container, any `shimmer` elements inside will use that value unless they override it.
- If no value is set anywhere, text shimmer falls back to `6ch`.

Uses the Tailwind spacing scale.

```html
<span class="shimmer shimmer-spread-24 text-foreground/40">Wide highlight</span>
```

### `shimmer-angle-{degrees}`

Shimmer direction. Default: `90`deg. Shared with `shimmer-bg`.

`--shimmer-angle` is inheritable:

- If you set `--shimmer-angle` (or use `shimmer-angle-{degrees}`) on a parent container, any `shimmer` or `shimmer-bg` elements inside will use that angle unless they define their own.
- If no value is set anywhere, both text and background shimmer fall back to `90deg`.

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

Set `--shimmer-width` on the container to sync all children. Any `shimmer-bg` or `shimmer` elements inside will inherit this width unless they define their own `shimmer-width-{value}`.

You can also set `--shimmer-speed`, `--shimmer-angle`, and `--shimmer-color` on the same container to keep both text shimmer and background shimmer moving in the same direction, at the same speed, and with the same highlight color. You can also set `--shimmer-bg-spread` on the container (or individual skeleton elements) to widen or tighten the background highlight band for all `shimmer-bg` children:

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

### `shimmer-color-{color}` (with shimmer-bg)

The same `shimmer-color-*` utility works for both text and bg shimmer:

```html
<div class="shimmer-bg shimmer-color-blue-100 h-4 w-48 rounded bg-blue-300" />
```

### Angled Skeleton Shimmer

Use `shimmer-angle-{degrees}` (shared with text shimmer) for diagonal sweeps:

```tsx
<div
  class="shimmer-angle-15 flex gap-3"
  style={{ ["--shimmer-width" as string]: "600" }}
>
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="shimmer-bg bg-muted h-4 w-full rounded" />
</div>
```

## Advanced: Position-Based Sync

> **Note:** These utilities are **optional** and only relevant for angled shimmers (`shimmer-angle-*` ≠ 90°). Most users can skip this section.

### `shimmer-x-{value}` / `shimmer-y-{value}`

Manual position hints for syncing angled shimmer animations across multiple elements. When using diagonal shimmers on layouts with multiple skeleton elements (e.g., avatar + text lines), the highlights may appear slightly out of sync because each element animates independently.

These utilities let you specify each element's approximate position (in pixels) relative to a shared container. The plugin uses these values to calculate animation delays, aligning the diagonal sweep across elements.

- `shimmer-x-*`: Horizontal offset from container left
- `shimmer-y-*`: Vertical offset from container top
- `-shimmer-x-*` / `-shimmer-y-*`: Negative offsets

**How it works:** The x/y values feed into an animation-delay formula that accounts for the shimmer angle. This creates the illusion of a single diagonal highlight passing through all elements.

> **Tip:** For larger or rounded elements (like avatars), use the element's approximate center rather than its top-left corner. The sync math treats each element as a single reference point, so using the center better matches where the shimmer visually "passes through" the element. Finding good offsets may still require some trial and error.
>
> For example, a 40×40 avatar at the left edge of the container would often look better with `shimmer-x-20 shimmer-y-20` than `shimmer-x-0 shimmer-y-0`.

```tsx
<div class="shimmer-angle-15" style={{ ["--shimmer-width" as string]: "600" }}>
  <div class="shimmer-bg shimmer-x-20 shimmer-y-20 bg-muted size-10 rounded-full" />
  <div class="shimmer-bg shimmer-x-52 shimmer-y-0 bg-muted h-4 w-24 rounded" />
  <div class="shimmer-bg shimmer-x-52 shimmer-y-24 bg-muted h-4 w-full rounded" />
</div>
```

## Limitations

`tw-shimmer` is intentionally **zero-dependency and CSS-only**. This keeps it lightweight and framework-agnostic, but it comes with trade-offs:

- **No automatic layout detection:** CSS cannot access runtime element positions, so perfectly unified diagonal shimmer across arbitrarily positioned elements cannot be fully automated.

- **Vertical shimmers just work:** For `shimmer-angle-90` (the default), all elements naturally sync without any extra configuration.

- **Angled shimmers are best-effort:** The `shimmer-x-*` / `shimmer-y-*` utilities enable manual sync tuning, but some minor desync or visual artifacts may still occur—especially at shallow angles or with large rounded shapes.

- **Complex layouts may need JavaScript:** If your application requires truly "physically correct" shimmer alignment across a complex layout, that would require measuring element positions at runtime and setting CSS variables via JavaScript. `tw-shimmer` intentionally does not do this.

For most skeleton loaders and text shimmer use cases, the defaults work well. The advanced position utilities are there for power users who want fine-grained control over angled animations.

## License

MIT
