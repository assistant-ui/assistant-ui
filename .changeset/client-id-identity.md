---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
---

feat: `getClientId(client)` returns an opaque, WeakMap-legal identity for a bound client — the same object regardless of accessor wrapping depth. The cloud message persistence cache is now keyed on it instead of the per-mount accessor proxy. Removes `unwrapClientAccessor` and `getBoundClient` (introduced and replaced pre-release, never published).
