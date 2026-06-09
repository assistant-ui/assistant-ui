---
"@assistant-ui/react-o11y": patch
"@assistant-ui/react-mcp": patch
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/tap": patch
---

refactor: adopt the extracted-hook convention for resources

A resource body is a hook, so resources are now authored as a `use`-prefixed hook
wrapped with `resource()`:

```ts
const useCounter = () => { ... };
const Counter = resource(useCounter);
```

`resource()` turns a hook into a Resource; `useResource(Counter(props))` turns it
back into a hook call. The `tap-hooks/named-resource` lint rule now enforces this
(inline `resource(() => ...)` / `resource(function ...)` is rejected), so React's
stock rules-of-hooks and exhaustive-deps lint resource bodies directly. No
public API or runtime behavior changes.
