---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/tap": patch
---

feat(tap): resources now carry all hook arguments, not just a single `props`

A `ResourceElement` is now `{ type, args }` where `args` is the full tuple of arguments passed to the resource, instead of `{ type, props }`. This lets a resource take multiple positional arguments, exactly like a hook:

```ts
const usePair = (a: number, b: string) => ({ a, b });
const Pair = resource(usePair);
const element = Pair(1, "hi"); // { type, args: [1, "hi"] }
```

The single-object case is unchanged ergonomically (`Counter({ initialValue: 0 })` still works; its `args` is just `[{ initialValue: 0 }]`), so existing resources and call sites are unaffected. `resource()`'s three overloads collapse into one variadic signature. Internally `renderResourceFiber` threads the arg tuple and `callResourceFn` spreads it (`fn(...args)`).

Breaking (internal/advanced): the second type parameter of `Resource`/`ResourceElement`/`ContravariantResource` now means the argument tuple `A extends readonly unknown[]` rather than a single payload `P`. Explicit two-arg annotations must wrap the payload in a tuple (e.g. `ResourceElement<R, [Props]>`). Reading `element.props` becomes `element.args[0]`. `useResource(element, deps)`'s second arg is unchanged in behavior (renamed `argsDeps`).
