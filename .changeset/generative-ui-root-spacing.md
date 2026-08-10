---
"@assistant-ui/react-generative-ui": patch
---

fix: let a composition read as one answer instead of a stack of boxes

`Card` was described to the model as "a bordered container", which made it the only way to express a titled section, so every grouping arrived with a border, background, shadow and padding it never asked for. The frame was also load-bearing: `present` rendered its tree as bare fragments, so blocks landed in the host's message container, which is not ours and sets no gap, and wrapping everything in one outer card was the only way to get any separation.

**Blocks are spaced by the surface.** The tree now sits in a `[data-aui="root"]` element that carries the vertical rhythm, as a gap between its own blocks and a block margin between consecutive calls. Those margins collapse in a block container, which is what a message body usually is. A host that lays its message parts out with flex or grid does not collapse them, so they add to that host's own `gap`; reduce the gap, or override `[data-aui="root"]`'s `margin-block`, if the result reads too airy. `renderGenerativeUI` is unchanged and still returns exactly what it is given, so embedding a single node in your own layout works as before.

**A card earns its frame.** It renders as a plain section and takes on a surface only where one is warranted: a tinted `background`, a `confirm`/`cancel` footer whose buttons need a delimited target, or a carousel slot. The renderer stamps `data-aui-surface` for the first two, so the stylesheet needs no `:has()` and degrades cleanly on older browsers. The component description is rewritten to match, which is the part that changes what a model emits. No API change.
