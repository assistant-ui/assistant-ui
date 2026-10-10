---
"@assistant-ui/generative-ui": patch
---

fix(generative-ui): name the `present` schema's reserved keys `_type`, `_key`, and `_action` so Anthropic models accept the tool. Models are told the root node needs `_type` too, a complete root without a type renders the `children` it wraps, trees in either spelling render, and development builds warn about prop names Anthropic rejects.
