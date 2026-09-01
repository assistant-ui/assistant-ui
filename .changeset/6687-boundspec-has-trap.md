---
"@assistant-ui/react-generative-ui": patch
---

fix: bound a node whose `has` trap hides `children` from the pre-pass

`boundSpec` gated its record branch on `"children" in value`, a `[[HasProperty]]`, while every consumer reads `children` with `[[Get]]`. A record whose `has` trap answered `false` for `"children"` was returned untouched, and `normalizeSpec` then pulled the array through the `get` trap and walked its full reported length, skipping the children cap, the node budget, and the depth ceiling. Every object is now returned as a plain copy whose `children` comes from the same read the bound used.
