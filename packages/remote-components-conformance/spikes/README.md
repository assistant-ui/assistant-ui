# Layout spikes (Chromium headless, Playwright 1.64.1)

Run from this package (so `playwright` resolves): `node spikes/<file>.mjs`.

## intrinsic-sizer.mjs — result: PASS in all 9 contexts

Question: can a host-side block box be given an *arbitrary* min-content
width A and max-content width B (A ≤ B) while still filling its container
like a normal block (`width: auto`)?

Answer: yes, using a "compressible replaced element" (CSS Sizing 3 §5.2.2):

```html
<div style="min-width: Apx; height: Hpx">                <!-- sizer -->
  <canvas style="display:block; width:Bpx; max-width:100%; height:0"></canvas>
</div>
```

- The canvas has a percentage `max-width`, so its min-content contribution is
  0 and its max-content contribution is B.
- The sizer's `min-width: A` lifts its min-content contribution to A.
- `width: auto` still fills the container in block layout.

Verified equal (±0.5px) to a `display:flow-root` box with real text in:
flex row (basis auto), flex shrink below max, grid `min-content`,
`max-content`, `auto` tracks, `width: fit-content`, float, `width:
min-content`, plain block. `<img>` and `<iframe>` behave identically; we use
`<canvas>` (no network, no alt semantics).

## fractional-viewport.mjs — result: viewport is integer

A cross-origin iframe with CSS width 316.609px has `innerWidth == 317` and
its root lays out at 317px. So the remote **must not** lay out against its
viewport: the host sends the exact fractional slot width and the remote sets
`#rc-root { width: <exact>px }`. The viewport may be up to 0.5px narrower or
wider than the root; the overflow sliver is clipped (documented).
