---
"@assistant-ui/react": patch
---

fix(mcp-apps): send the 2026-01-26 dialect on host→app messages so widgets built with `@modelcontextprotocol/ext-apps` initialize and receive tool results

the bridge already normalized inbound `ui/*` method names, but every outbound message (the `ui/initialize` result and the tool input/result/host context notifications) stayed in the pre-spec dialect. spec widgets zod-validate the initialize result and require `hostInfo` + `hostCapabilities`, so they failed init; tool results were posted as `notifications/tools/call/result`, a method the official SDK never listens for, so a patched widget still rendered empty. the bridge now additively dual-sends both dialects (the initialize result carries `host`/`capabilities` and `hostInfo`/`hostCapabilities`, echoes the app's requested `protocolVersion`, and each notification posts its `ui/notifications/*` counterpart with the spec param shapes). unknown methods and fields are ignored by either SDK, so legacy widgets are unaffected.
