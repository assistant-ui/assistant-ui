---
"@assistant-ui/ui": patch
---

feat(elements/sources): add an optional compact `layout="list"` for the Sources card, fix a React key collision

`Sources` now accepts an optional `layout?: "grid" | "list"` prop, defaulting to `"grid"` so every existing usage is unchanged. `"list"` renders one compact line per source (a favicon glyph, then title and domain) instead of the two-column card grid, for a caller whose source list is long or whose reply already carries enough detail that the grid reads as taking more room than it needs.

Also fixes a real bug found while adding the list layout: both layouts keyed each row by `source.domain`, so two different pages on the same site in one `sources` array produced two rows with the identical React key. Both layouts now key by array index instead.
