---
"generative-frame": patch
---

feat: `validateSpec` reports `unfilled-placeholder` for a plain string that holds a `${/path}`, `${$item…}`, or `${$index}` placeholder, or that is only an expression key such as `"$calc"`, since both render as written, and the spec guidance says that only `$template` and `$calc` fill placeholders and that an expression can sit at any depth inside a prop, so a model that writes `"${/guests} × 450 g"` or a `"$calc"` table cell fixes it in the repair round.
