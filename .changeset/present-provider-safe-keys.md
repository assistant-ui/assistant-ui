---
"@assistant-ui/generative-ui": patch
---

fix(generative-ui): name the `present` schema's reserved keys `_type`, `_key`, and `_action` so Anthropic models accept the tool, and tell models the root node needs `_type` too; trees in either spelling render, and development builds warn about prop names Anthropic rejects
