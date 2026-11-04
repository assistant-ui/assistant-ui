---
"@assistant-ui/react-pi": patch
---

Validate base64 image payloads with the shared `parseBase64` from `@assistant-ui/core/internal` and send them to Pi without line breaks, so a folded payload no longer reaches Pi as written. A payload carrying whitespace other than a tab, line break or space (a form feed, vertical tab or non-breaking space) is now rejected with `Invalid Pi image attachment source`.
