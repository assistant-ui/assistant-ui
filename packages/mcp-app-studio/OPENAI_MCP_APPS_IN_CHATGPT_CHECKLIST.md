# OpenAI “MCP Apps in ChatGPT” checklist

Last verified: 2026-02-05

This is an implementation checklist for aligning `mcp-app-studio` (SDK) and
`mcp-app-studio-starter` (template/workbench) with OpenAI’s guidance that:

- ChatGPT is an **MCP Apps host** (standard `ui/*` bridge).
- `window.openai` is an **optional**, ChatGPT-only extension layer.

## Protocol + metadata

- [ ] Tools that render a UI specify `_meta.ui.resourceUri` (string) on the tool descriptor.
- [ ] Compatibility: accept legacy `_meta["openai/outputTemplate"]` (string) as an alias for `_meta.ui.resourceUri`.
- [ ] Prefer emitting `_meta.ui.resourceUri` (do **not** emit `openai/outputTemplate` in new output).

## MCP Apps UI bridge (host ↔ iframe)

The core integration should use the MCP Apps UI bridge (JSON-RPC 2.0 over
`postMessage`), including:

- [ ] `ui/initialize`
- [ ] `ui/notifications/tool-input`
- [ ] `ui/notifications/tool-result`
- [ ] `tools/call`
- [ ] `ui/message`
- [ ] `ui/update-model-context`

## ChatGPT-only extensions (`window.openai`)

Only use these via feature detection + graceful fallback. Examples called out by OpenAI:

- [ ] `window.openai.requestCheckout(...)`
- [ ] `window.openai.uploadFile(file)`
- [ ] `window.openai.getFileDownloadUrl({ fileId })`
- [ ] `window.openai.requestModal(...)`

Additional frequently-used globals/APIs described in the Apps SDK reference:

- [ ] `window.openai.toolInput` / `window.openai.toolOutput` / `window.openai.toolResponseMetadata`
- [ ] `window.openai.widgetState` / `window.openai.setWidgetState(state)`
- [ ] `window.openai.callTool(name, args)`
- [ ] `window.openai.sendFollowUpMessage({ prompt })`
- [ ] `window.openai.openExternal({ href })`
- [ ] `window.openai.notifyIntrinsicHeight(height)`
- [ ] `window.openai.requestDisplayMode({ mode })`

## Docs + UX expectations

- [ ] README/docs describe ChatGPT as an MCP host (not a separate platform).
- [ ] `window.openai` is explicitly documented as optional ChatGPT-only extensions.
- [ ] SDK behaves well outside a host (no indefinite connect hangs; timeouts + clear errors).

## Sources (OpenAI)

- “MCP Apps in ChatGPT”: https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt
- “Apps SDK Reference” (window.openai + `_meta` keys + bridge overview): https://developers.openai.com/apps-sdk/reference
