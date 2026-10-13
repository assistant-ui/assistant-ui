---
"generative-frame": patch
---

feat: `validateSpec` reports `unfilled-placeholder` for a plain string that holds a `${/path}`, `${$item…}`, or `${$index}` placeholder, which renders as written because only `$template` and `$calc` fill placeholders, and the spec guidance says so, so a model that writes `"${/guests} × 450 g"` in a prop fixes it in the repair round.
