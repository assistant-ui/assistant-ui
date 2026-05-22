---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

feat(core, react): add `MessagePrimitive.GenerativeUI` primitive

A new first-class primitive for rendering agent-described React UI from a JSON
spec, with a consumer-provided component allowlist as the security boundary.

The agent emits a new `generative-ui` message part containing a tree of
components by name; `MessagePrimitive.GenerativeUI` walks the spec and resolves
each name against the registry you pass in. Unknown names throw a typed
`GenerativeUIRenderError` (or invoke the optional `Fallback`). Composes with
`MessagePrimitive.Parts` via the new `components.generativeUI` option, and
supports streaming partial specs.

```tsx
<MessagePrimitive.Parts
  components={{
    generativeUI: { components: { Card, Button } },
  }}
/>
```
