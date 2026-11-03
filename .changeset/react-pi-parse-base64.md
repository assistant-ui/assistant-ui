---
"@assistant-ui/react-pi": patch
---

Validate bare base64 image payloads with `parseBase64` from
`@assistant-ui/core/internal`, the parser the ADK, A2A, ACP and LangChain
converters already use, instead of keeping a second copy in Pi. A payload that
carries whitespace other than a tab, line break or space — a form feed,
vertical tab or non-breaking space — is now rejected with `Invalid Pi image
attachment source`; Pi's copy stripped every `\s` before validating. MIME line
folding uses CRLF, so folded payloads are unaffected.
