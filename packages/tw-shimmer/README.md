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

Animation speed in pixels per second. Default: `150`px/s for text, `1000`px/s for background.

`--shimmer-speed` is inheritable:

- If you set `--shimmer-speed` (or use `shimmer-speed-{value}`) on a parent container, both `shimmer` and `shimmer-bg` children will use that value unless they override it.
- If no value is set anywhere, text shimmer falls back to `150` and background shimmer falls back to `1000`.

> **How speed is calculated:** For text shimmer, duration is `(2 × width) / speed`, where width is the shimmer track width in pixels (from `--shimmer-width`). For background shimmer we use the same idea but include an angle-aware overshoot so the stripe starts and ends fully off-screen at shallow angles. At 90deg this reduces to the same `(2 × width) / speed` formula; at more extreme angles the pass time is slightly longer to account for the extra travel. Spread does not affect timing; it only controls how thick the highlight appears.

When `shimmer-bg` is used inside a `shimmer-container`, the plugin derives `--shimmer-speed` automatically from the container width so that each shimmer pass takes roughly 1.1–1.6 seconds, depending on container size. Smaller containers run slightly faster, larger containers slightly slower, which feels more consistent than a perfectly flat duration. Text shimmer in containers uses a slightly slower multiplier (~2.2–3.2 second passes) for a more subtle effect. You can still override this by setting `--shimmer-speed` (or using `shimmer-speed-{value}`) on any ancestor or the element itself.

```html
<span class="shimmer shimmer-speed-200 text-foreground/40">Fast (200px/s)</span>
```

### `shimmer-width-{value}`

Container width in pixels for animation timing. Default: `200`px for text shimmer, `800`px for background shimmer.

`--shimmer-width` is inheritable:

- If you set `--shimmer-width` (or use `shimmer-width-{value}`) on a parent container, both `shimmer` and `shimmer-bg` children will use that value unless they override it.
- If no value is set anywhere, text shimmer falls back to `200` and background shimmer falls back to `800`.

Set this to match your container width for consistent animation speed across different element sizes.

When used inside `shimmer-container`, the plugin sets an auto track width based on the container's width; this auto value is used only if you haven't explicitly set `--shimmer-width` yourself. Any explicit `--shimmer-width` (or `shimmer-width-{value}`) still wins and will be used to compute timing.

```tsx
<span class="shimmer shimmer-width-300 text-foreground/40">Wide container</span>
```

Or set via CSS variable at runtime:

```tsx
<span class="shimmer" style={{ ["--shimmer-width" as string]: "300" }}>
  Wide container
</span>
```

#### CSS-only Auto-Width with `shimmer-container`

In modern browsers that support CSS container queries and container units (Chrome 111+, Safari 16.4+, Firefox 110+), you can use the `shimmer-container` helper class to automatically set `--shimmer-width` based on the container's width:

```html
<div class="shimmer-container flex gap-3">
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg bg-muted h-4 w-24 rounded" />
    <div class="shimmer-bg bg-muted h-4 w-full rounded" />
  </div>
</div>
```

Inside `shimmer-container`, tw-shimmer automatically:

- Sets the shimmer track width based on the container width (`--shimmer-width` auto).
- Derives the animation speed from the container width so that one shimmer pass takes roughly 1.1–1.6 seconds, depending on container size. Small containers feel snappier, larger containers a bit slower, while keeping the motion perceptually consistent.
- For `shimmer-bg`, adjusts the highlight spread based on the container width, clamping it between a sensible minimum (about 200px, or the track width if smaller) and maximum (about 300px) so it looks good at any size.

These container-based values act as smart defaults. Any explicit `--shimmer-width`, `--shimmer-speed`, or `--shimmer-bg-spread` that you set (for example via `shimmer-width-*`, `shimmer-speed-*`, or `shimmer-bg-spread-*`) will override them, even inside `shimmer-container`.

This is primarily useful for **skeleton/background shimmer layouts** where the container already has a stable width defined by its parent or layout context.

> **Note:** `shimmer-container` sets `container-type: inline-size`, which prevents the container from sizing based on its contents. This means it's **not recommended for text-only containers** that rely on shrink-to-fit behavior. For those cases, continue using JS or the `shimmer-width-*` utility.

In older browsers, `shimmer-container` has no effect and shimmers fall back to their default widths or manually configured values.

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

> **Note on angle values:** Avoid exactly `0deg` and `180deg`, as these create extreme values in the animation delay formula (which uses tangent). For diagonal sweeps, use angles in a "safe" range such as 15–75° or 105–165°. Extreme angles can cause very large delays and may visually desync the animation.

```html
<span class="shimmer shimmer-angle-45 text-foreground/40"
  >Diagonal (45deg)</span
>
```

## Background Shimmer (Skeletons)

For skeleton loaders and non-text elements, use `shimmer-bg` instead:

### `shimmer-bg`

Background shimmer for skeleton loaders and non-text elements. Use standard Tailwind `bg-*` for base color. Standalone default: 800px width, 1000px/s speed.

```html
<div class="shimmer-bg bg-muted h-4 w-48 rounded" />
```

### Skeleton Example

To sync shimmer timing across all skeleton children, you have two options:

**Option 1: CSS-only with `shimmer-container` (recommended for modern browsers)**

Wrap skeleton elements in `shimmer-container` for consistent timing. The container auto-derives speed so each pass takes roughly 1.1–1.6 seconds depending on width, and clamps the highlight spread to a width-aware band (roughly 200–300px, or the track width if smaller). All `shimmer-bg` children sync to the same animation. Older browsers fall back to standalone defaults.

```html
<div class="shimmer-container flex gap-3">
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="flex-1 space-y-2">
    <div class="shimmer-bg bg-muted h-4 w-24 rounded" />
    <div class="shimmer-bg bg-muted h-4 w-full rounded" />
    <div class="shimmer-bg bg-muted h-4 w-4/5 rounded" />
  </div>
</div>
```

**Option 2: Manual width with CSS variable or JS**

Set `--shimmer-width` on the container manually. Any `shimmer-bg` or `shimmer` elements inside will inherit this width unless they define their own `shimmer-width-{value}`:

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

You can also set `--shimmer-speed`, `--shimmer-angle`, and `--shimmer-color` on the same container to keep both text shimmer and background shimmer moving in the same direction, at the same speed, and with the same highlight color. You can also use `shimmer-bg-spread-*` or set `--shimmer-bg-spread` on the container (or individual skeleton elements) to override the container's auto spread and manually control the background highlight band width.

### `shimmer-color-{color}` (with shimmer-bg)

The same `shimmer-color-*` utility works for both text and bg shimmer:

```html
<div class="shimmer-bg shimmer-color-blue-100 h-4 w-48 rounded bg-blue-300" />
```

### Angled Skeleton Shimmer

Use `shimmer-angle-{degrees}` (shared with text shimmer) for diagonal sweeps. This works with both `shimmer-container` and manual width configuration:

```html
<div class="shimmer-container shimmer-angle-15 flex gap-3">
  <div class="shimmer-bg bg-muted size-10 rounded-full" />
  <div class="shimmer-bg bg-muted h-4 w-full rounded" />
</div>
```

## Advanced: Position-Based Sync

> **Note:** These utilities are **optional** and only relevant for angled shimmers (`shimmer-angle-*` ≠ 90°). Most users can skip this section.

### `shimmer-x-{value}` / `shimmer-y-{value}`

Manual position hints for syncing angled shimmer animations across multiple elements. When using diagonal shimmers on layouts with multiple skeleton elements (e.g., avatar + text lines), the highlights may appear slightly out of sync because each element animates independently.

These utilities let you specify each element's approximate position (in pixels) relative to a shared container. The plugin uses these values to calculate animation delays, aligning the diagonal sweep across elements.

- `shimmer-x-*`: Horizontal offset from container left (unitless, interpreted as pixels)
- `shimmer-y-*`: Vertical offset from container top (unitless, interpreted as pixels)

**How it works:** The x/y values feed into an animation-delay formula that accounts for the shimmer angle. This creates the illusion of a single diagonal highlight passing through all elements.

> **Tip:** For larger or rounded elements (like avatars), use the element's approximate center rather than its top-left corner. The sync math treats each element as a single reference point, so using the center better matches where the shimmer visually "passes through" the element. Finding good offsets may still require some trial and error.
>
> For example, a 40×40 avatar at the left edge of the container would often look better with `shimmer-x-20 shimmer-y-20` than `shimmer-x-0 shimmer-y-0`.

> **Angle caveat:** Position sync works best with moderate angles (15–75° or 105–165°). Avoid exactly 0° and 180° as these cause extreme delay values. See the `shimmer-angle-*` section for details.

```html
<div class="shimmer-container shimmer-angle-15">
  <div
    class="shimmer-bg shimmer-x-20 shimmer-y-20 bg-muted size-10 rounded-full"
  />
  <div class="shimmer-bg shimmer-x-52 shimmer-y-0 bg-muted h-4 w-24 rounded" />
  <div
    class="shimmer-bg shimmer-x-52 shimmer-y-24 bg-muted h-4 w-full rounded"
  />
</div>
```

### Advanced: Offscreen Overshoot (background shimmer)

For angled background shimmers (`shimmer-bg` with `shimmer-angle-*`), the plugin automatically adjusts how far the shimmer stripe starts and ends off-screen based on the angle. This helps avoid the highlight being visible at the left edge at the very start of the animation, especially at shallow angles (e.g. 15–30°).

Internally, this uses an angle-aware overshoot multiplier:

- Steep angles (~90°) → multiplier ≈ 1 (no extra overshoot)
- Moderate angles (e.g. 45°) → multiplier ≈ 1.3
- Shallow angles (e.g. 15° or 165°) → multiplier up to ≈ 3 (clamped)

You can override this behavior per element or per container using the CSS variable:

```css
--shimmer-offscreen-multiplier: 1.5; /* or any positive value */
```

For example:

```html
<div
  class="shimmer-container"
  style="--shimmer-angle: 20deg; --shimmer-offscreen-multiplier: 2;"
>
  <div class="shimmer-bg bg-muted h-4 w-full rounded"></div>
</div>
```

Most users never need to set this manually; it exists for power users who are tuning very shallow angles or unusual aspect ratios.

## Browser Support & Accessibility

### Modern CSS Requirements

`tw-shimmer` uses modern CSS features for the best visual quality:

- `oklch` and `color-mix` for perceptually uniform color mixing
- `translate` as an independent transform property
- `overflow: clip` for precise clipping (with `overflow: hidden` fallback)

These features are supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 16.4+). Older browsers will degrade gracefully but may not render the full effect.

## Limitations

`tw-shimmer` is intentionally **zero-dependency and CSS-only**. This keeps it lightweight and framework-agnostic, but it comes with trade-offs:

- **`shimmer-container` auto-width/auto-speed/auto-spread are progressive enhancements:** The `shimmer-container` helper uses modern CSS container units (`cqw`) and is gated by `@supports (width: 1cqw)`. In unsupported browsers, `shimmer-container` has no effect and shimmer elements fall back to their default widths or manually configured values.

- **`shimmer-container` prevents shrink-to-fit sizing:** Because it sets `container-type: inline-size`, the container cannot size itself based on its contents. This makes it unsuitable for text-only containers that rely on intrinsic sizing.

- **No automatic layout detection:** CSS cannot access runtime element positions, so perfectly unified diagonal shimmer across arbitrarily positioned elements cannot be fully automated.

- **Vertical shimmers just work:** For `shimmer-angle-90` (the default), all elements naturally sync without any extra configuration.

- **Angled shimmers are best-effort:** The `shimmer-x-*` / `shimmer-y-*` utilities enable manual sync tuning, but some minor desync or visual artifacts may still occur—especially at shallow angles or with large rounded shapes.

- **Complex layouts may need JavaScript:** If your application requires truly "physically correct" shimmer alignment across a complex layout, that would require measuring element positions at runtime and setting CSS variables via JavaScript. `tw-shimmer` intentionally does not do this.

For most skeleton loaders and text shimmer use cases, the defaults work well. The advanced position utilities are there for power users who want fine-grained control over angled animations.

## License

MIT
