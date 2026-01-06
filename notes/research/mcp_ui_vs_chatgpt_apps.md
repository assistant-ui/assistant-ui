---
date: 2026-01-06T04:05:00Z
researcher: opencode
git_commit: 52b66201f
branch: mcp_standard_aui
repository: assistant-ui
topic: "Exhaustive Comparison: MCP Tool UI Protocol vs OpenAI Apps SDK"
tags: [research, mcp, protocol, chatgpt-apps, sdk]
status: complete
last_updated: 2026-01-06
last_updated_by: opencode
---

# Research: Exhaustive Comparison - MCP Tool UI Protocol vs OpenAI Apps SDK

**Date**: 2026-01-06
**Researcher**: opencode
**Git Commit**: 52b66201f
**Branch**: mcp_standard_aui
**Repository**: assistant-ui

## Research Question
Can we add everything missing from the ChatGPT Apps spec to our current MCP Tool UI protocol, or do we need to fundamentally restructure for that?

## Summary
The current MCP Tool UI protocol is **fully compatible** with the architecture required for ChatGPT Apps parity. Every missing feature from the OpenAI Apps SDK can be implemented as an **additive extension** to our `postMessage` bridge and manifest schema. No fundamental restructure is required. The move from "static viewing" to "interactive app" primarily involves adding request/response correlation and expanding the global state synchronization.

---

## Exhaustive Feature Comparison

### 1. `window.openai` API (Actions)

| Feature | Support | Path to Parity |
| :--- | :--- | :--- |
| `callTool(name, args)` | ❌ No | Add `tool-call` / `tool-result` messages with request IDs. |
| `setWidgetState(state)` | ❌ No | Add `set-state` message; persist in parent's conversation context. |
| `sendFollowUpMessage({ prompt })` | ❌ No | Add `send-message` message type to bridge. |
| `requestDisplayMode({ mode })` | ❌ No | Add `set-display-mode` message + parent UI response. |
| `requestModal({ title, params })` | ❌ No | Add `open-modal` message + Shadcn Dialog in parent. |
| `requestClose()` | ❌ No | Add `close-widget` message to bridge. |
| `openExternal({ href })` | ❌ No | Add `open-url` message; parent handles safe-linking. |
| `uploadFile(file)` | ❌ No | Add `upload-file` message + parent file picker. |
| `getFileDownloadUrl({ fileId })` | ❌ No | Add `get-file-url` request/response pair. |
| `notifyIntrinsicHeight({ height })` | ✅ Yes | Currently implemented as `resize` message. |

### 2. Global State (Properties)

| Feature | Support | Path to Parity |
| :--- | :--- | :--- |
| `toolInput` | ✅ Yes | Currently passed in `render` props. |
| `toolOutput` | ✅ Yes | Currently passed in `render` props as `result`. |
| `theme` (light/dark) | ❌ No | Push `theme` in the initial `render` handshake. |
| `locale` | ❌ No | Push user's BCP 47 locale in `render` handshake. |
| `displayMode` | ❌ No | Push current mode (`inline`, `fullscreen`) in handshake. |
| `maxHeight` | ⚠️ Partial | We have a hardcoded 800px cap; should be dynamic. |
| `widgetState` | ❌ No | Pass rehydrated state in `render` handshake. |
| `userAgent` / `safeArea` | ❌ No | Push device context in handshake. |

### 3. Protocol Metadata (`_meta`)

| Field | Purpose | Action |
| :--- | :--- | :--- |
| `openai/outputTemplate` | UI URI mapping | Extend our manifest to support `ui://` protocols. |
| `openai/widgetAccessible` | Permissions | Add to `permissions` block in our manifest. |
| `openai/visibility` | Hidden tools | Add visibility flags to our tool schema. |
| `openai/fileParams` | File inputs | Add file-type detection to our Zod schemas. |
| `openai/widgetCSP` | Sandbox config | Map to iframe `sandbox` and `csp` attributes. |

---

## Architecture Evolution vs. Restructure

Our current protocol uses a **fire-and-forget** model:
- Parent sends `render(props)`
- Iframe sends `resize(height)`

To reach 100% parity, we need to evolve to a **Request/Response** model:
1. **Correlation IDs**: Add a `id: string` to all messages.
2. **Global Sync**: Formalize the `openai:set_globals` event where the parent pushes a complete context object (theme, locale, state) to the iframe whenever it changes.
3. **RPC Bridge**: Implement `callTool` as an async RPC call over `postMessage`.

**This is an evolution, not a restructure.** The existing `RemoteToolUI` and `createToolUIRuntime` can remain backward compatible while adopting these new patterns.

## Open Standards Opportunity
By aligning with the OpenAI SDK naming and patterns but using an open protocol, we enable:
- **Studio compatibility**: Pete's `tool-ui-studio` can generate code once.
- **Unified Bridge**: A single React hook (`useAssistantUI`?) that abstracts both the `window.openai` bridge and our open bridge.

## Open Questions
- **Auth (OAuth 2.1)**: This is the largest "platform" feature. We should investigate if we want to provide a standard Auth provider in the `tool-ui-server` SDK or keep it custom per server.

---

## Code References
- `packages/tool-ui-server/src/remote/remote-tool-ui.tsx` - The foundation for the message bridge.
- `packages/tool-ui-server/src/create-tool-ui-runtime.ts` - The iframe-side listener that needs to be expanded into a full SDK mock.
- `packages/tool-ui-server/src/schemas/manifest.ts` - The registry configuration that needs new permission fields.
