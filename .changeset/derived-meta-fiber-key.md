---
"@assistant-ui/store": patch
---

fix(store): key `Derived` scopes by `{source, query}` so a meta change produces a new client function in the same render pass. Previously a `Derived` whose `query` changed (e.g. `MessageByIndexProvider` whose `index` prop changed across renders) kept its underlying resource fiber, and the `get` closure was updated via `tapEffectEvent` — which lags one commit. During the in-flight render after a meta change, child consumers reading through the derived scope could resolve through the previous closure and read an index the underlying store no longer had. Hashing the meta into the `tapResources` key forces the fiber to be replaced when meta changes, so the new `clientFunction` (and the new `get`) propagates through React context immediately. Also drops the unused dynamic-meta variant (`Derived({ getMeta })`); use static `source`/`query`.
