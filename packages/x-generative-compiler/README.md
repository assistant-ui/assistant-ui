# @assistant-ui/x-generative-compiler

> **Internal package.** Not meant for direct use. Use a build integration such as
> [`@assistant-ui/next`](../next) or [`@assistant-ui/vite`](../vite).

The framework-agnostic `"use generative"` compiler. It takes a module that
colocates a tool's schema, its server-only `execute`, and its client-only
`render`, and rewrites it for a single build target:

- **client** — keeps `render` and any `"use client"` `execute` (frontend tools),
  drops backend `execute` and `hitl()` sentinels, and stamps each tool's inferred
  `type`.
- **server** — keeps the backend `execute` (importing `server-only`), drops
  `render`.

The marker functions a `"use generative"` file imports — `defineToolkit` and
`hitl` — live in `@assistant-ui/core/react` (re-exported from `@assistant-ui/react`).
This package only recognizes them by name and strips them at build time.

## API

```ts
import {
  compileGenerative,
  isGenerativeModule,
  GenerativeCompileError,
  DIRECTIVE,
  type Target,
} from "@assistant-ui/x-generative-compiler";

if (isGenerativeModule(code)) {
  const { code: out, map } = compileGenerative(code, {
    target: "server", // or "client"
    filename,
    sourceMaps: true,
  });
}
```
