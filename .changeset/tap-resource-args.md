---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/tap": patch
---

feat(tap): resources carry all hook arguments; elements are `{ hook, args }`

A `ResourceElement` is now `{ hook, args }` (was `{ type, props }`): the underlying hook plus the full tuple of arguments to call it with. This lets a resource take multiple positional arguments, exactly like a hook, and makes hosting just `hook(...args)`:

```ts
const usePair = (a: number, b: string) => ({ a, b });
const Pair = resource(usePair);
const element = Pair(1, "hi"); // { hook: usePair, args: [1, "hi"] }
```

The single-object case is unchanged ergonomically (`Counter({ initialValue: 0 })` still works; its `args` is just `[{ initialValue: 0 }]`), so existing resources and call sites are unaffected. `resource()`'s overloads collapse into one variadic signature, and the `fnSymbol` / `callResourceFn` indirection is gone (the element holds the hook directly; `renderResourceFiber` calls `fiber.hook(...args)`).

Breaking (internal/advanced):
- The second type parameter of `Resource` / `ResourceElement` / `ContravariantResource` now means the argument tuple `A extends readonly unknown[]` rather than a single payload `P`. Explicit two-arg annotations must wrap the payload in a tuple (e.g. `ResourceElement<R, [Props]>`).
- A resource's identity is now its hook. Reading `element.props` becomes `element.args[0]`; reading `element.type` becomes `element.hook`. `attachTransformScopes` is now keyed by (and called with) the hook rather than the factory.
- `useResource(element, deps)`'s second arg is unchanged in behavior (renamed `argsDeps`).
