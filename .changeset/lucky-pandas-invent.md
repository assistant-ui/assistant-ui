---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: resolve MCP App renderer options per part

`McpAppRenderer` served every MCP app in a thread from one static options snapshot, so a host could not give one app its own `displayMode` and could not tell which app called `requestDisplayMode`. Renderer options now reach each part through the renderer store, and a new `forPart` resolver overrides `hostContext`, `handlers`, `maxHeight`, `sandbox`, `hostInfo`, and the fallbacks for a single part. Host context changes are compared structurally before they are pushed over the bridge, so a resolver may rebuild its result on every render.
