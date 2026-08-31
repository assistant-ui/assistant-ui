---
"@assistant-ui/react": patch
---

refactor: dispose WebMCP registrations through the abort signal alone

the WebMCP explainer defines no way to remove a tool other than aborting the `AbortSignal` passed to `registerTool`, and the spec IDL returns `Promise<undefined>` rather than an unregister handle. the provider carried both non-spec disposal paths anyway, plus a per-host ownership map that existed only so a name-keyed unregister could not delete a registration that had since taken the name over. no shipping or prototype host exposes either path. disposal is now the abort, which is identity-keyed and cannot displace a later registration.
