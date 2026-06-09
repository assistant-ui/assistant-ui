---
"@assistant-ui/store": patch
"@assistant-ui/tap": patch
---

refactor: rename the root APIs to `useTapRoot` / `createTapRoot` and make them callback-based

`useResourceRoot(element)` is now `useTapRoot(fn)` and `createResourceRoot().render(element)` is now `createTapRoot(fn)`. Both take a render callback instead of a pre-built resource element, so you no longer have to wrap a hook in `resource()` just to host it as a root. The callback must be a **named** function expression (so React's rules-of-hooks lints the body):

```ts
// before
const root = createResourceRoot();
const handle = root.render(Counter());
handle.getValue();

// after
const root = createTapRoot(function CounterRoot() { return useResource(Counter()); });
root.getValue();
```

`createTapRoot` returns `{ getValue, subscribe, unmount }` directly (no separate `.render` step).

`flushResourcesSync` is also renamed to `flushTapSync`, to match the `tap` naming of the root APIs (and to stay distinct from react-dom's `flushSync`).
