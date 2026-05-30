---
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: add a `display` presentation hint to tools and a `"standalone-tool-call"` key to `groupPartByType`.

Tool UIs fall into three buckets: prompting the user (human-in-the-loop), informing the user (generative UI), and traces of what the model is doing (routine frontend/backend tool calls). The first two should be surfaced on their own; the last belongs folded into the chain-of-thought trace. The new `display` field on a tool lets you place a tool in the right bucket without overloading `type`:

```ts
const toolkit = {
  ask_user:   { type: "human",    render: AskUI },     // standalone (forced — can't opt out)
  search_web: { type: "frontend", render: SearchUI },  // inline trace (default)
  checkout:   {
    type: "frontend",
    render: CheckoutUI,
    display: "standalone",                              // opt in
  },
} satisfies Toolkit;
```

- `display?: "standalone" | "inline"` is a client-only presentation hint (it never reaches the model). Defaults to `"inline"`.
- `human` tools are always `"standalone"` and cannot opt out (the type only allows `"standalone"`). MCP-app tool calls and the built-in generative-UI tool are standalone too. Every other tool defaults to inline and opts in explicitly.
- `groupPartByType` gains a synthetic `"standalone-tool-call"` key that matches all of the above. `MessagePrimitive.GroupedParts` passes the live tool-UI registry to the `groupBy` function as a second `context` argument (`{ toolUIs }`), and the helper reads it to resolve the registry-driven cases; MCP-app calls are detected from the part alone.
- The `"mcp-app"` key on `groupPartByType` is **deprecated** in favor of `"standalone-tool-call"` (a superset). It still works for back-compat.

The shadcn `thread.tsx` template is updated to use `"standalone-tool-call": []` in place of `"mcp-app": []`.
