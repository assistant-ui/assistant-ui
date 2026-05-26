---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: simplify `MessagePrimitive.GroupedParts` API and add `groupPartByType` helper.

- New `groupPartByType({ ... })` helper builds a `groupBy` from a `part.type → group-key path` lookup. The map keys are typed against `PartState["type"]` (autocomplete + typo rejection), missing keys leave the part ungrouped, and the returned function carries an internal memo fingerprint so the tree survives unrelated re-renders even when reconstructed inline.
- Special map key `"mcp-app"` matches tool-call parts that point at an assistant-ui MCP app resource (`ui://...`). It takes precedence over the `"tool-call"` entry for those parts, so MCP apps can be routed separately (e.g. rendered outside a chain-of-thought wrapper).
- `groupBy` signature simplified from `(part, index, parts) => string | string[] | null | undefined` to `(part) => readonly \`group-${string}\`[] | null`. The 2nd/3rd args were unused in practice. Arrays are required (no bare-string shorthand); `null` is accepted as an alias for `[]` to soften the migration.
- Internal memoization now uses the helper's memo fingerprint when present, otherwise rebuilds the tree per render (O(n), cheap). The previous "pass a stable reference" advice is dropped — inline `groupBy` is fine.
- Docs and examples updated to lead with `groupPartByType`. The `getMcpAppFromToolPart` branch in `packages/ui` switches to `"mcp-app": []` via the helper.
