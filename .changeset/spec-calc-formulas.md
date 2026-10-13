---
"generative-frame": patch
---

feat: add `$calc` formulas to spec expressions, so a spec can compute totals, quantities that follow an input, and formatted values from its state. Formulas are parsed by a bounded interpreter (no `eval`), give `null` instead of throwing, and `validateSpec` reports one that does not parse as `invalid-formula`. The spec guidance and the format rules now describe them, and a pointer into an array reads only the array's own items.
