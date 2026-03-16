---
"@assistant-ui/react-ink": patch
---

Add direct named exports for all primitives alongside existing namespace exports.

Bundlers that use static analysis for tree-shaking (notably Bun `--compile`) cannot trace dynamic property access through `export * as Namespace` re-export chains. This causes symbols like `MessagePrimitive.Root` to be dropped at compile time.

Both import patterns now work:
```ts
import { MessagePrimitive } from "@assistant-ui/react-ink"   // namespace (existing)
import { MessageRoot } from "@assistant-ui/react-ink"         // named (new)
```

Zero breaking changes — purely additive.
