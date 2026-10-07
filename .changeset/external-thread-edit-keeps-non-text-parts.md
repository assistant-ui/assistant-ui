---
"@assistant-ui/core": patch
---

fix: editing a message in `ExternalThread` keeps its image, file and other non-text parts, as the default edit composer already does, instead of sending only the text
