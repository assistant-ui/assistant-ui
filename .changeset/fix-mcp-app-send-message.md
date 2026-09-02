---
"@assistant-ui/react": patch
---

fix(react): accept spec-shaped MCP App messages

the default `sendMessage` handler now reads the MCP Apps `{ role, content }` params and appends each `text` block in order, alongside the existing `string`, `{ prompt }`, `{ text }`, and `{ message }` forms. rejections now also carry the spec's `isError: true`, and the legacy `ok` and `reason` fields stay on the result so widgets already reading them keep working.
