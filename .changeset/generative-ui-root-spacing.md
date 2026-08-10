---
"@assistant-ui/react-generative-ui": patch
---

fix: let a composition read as one answer instead of a stack of boxes

Three changes to how `present` output sits in a message, which together remove the reason a model had to wrap everything in one `Card` to look right.

**Blocks are spaced by the surface.** The tree rendered as bare fragments, so blocks landed directly in the host's message container, which is not ours and sets no gap. Several `present` calls in one turn, or one call emitting several top-level nodes, ran together with no separation. The tree is now wrapped in a `[data-aui="root"]` element that owns that rhythm. `renderGenerativeUI` is unchanged and still returns exactly what it is given, so embedding a single node in your own layout works as before.

**A card earns its frame.** `Card` was defined to the model as "a bordered container", which made it the only way to express a titled section, so every grouping arrived with a border, background, shadow and padding it did not need. It now renders as plain content and takes on a surface only where one is warranted: a tinted `background`, a `confirm`/`cancel` footer whose buttons need a delimited target, or a carousel slot that has to read as one item. Padding follows the surface for the same reason.

**The surface carries a copy control**, revealed on hover or keyboard focus in its top-right corner.
