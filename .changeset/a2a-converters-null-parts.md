---
"@assistant-ui/react-a2a": patch
---

fix: `a2aPartsToContent` and `a2aMessageToContent` skip null part entries instead of throwing, `a2aPartToContent` returns an empty text part for a null part, and a part with a null `text`, `url` or `raw` is read as if the field were absent, the way `A2AClient` already normalizes it
