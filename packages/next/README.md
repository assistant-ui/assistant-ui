# @assistant-ui/next

Next.js integration for assistant-ui: the `withAui()` config wrapper and the
compiler for the `"use generative"` directive. Colocate a tool's **schema**,
**server-only `execute`**, and **client-only `render`** in one file; the compiler
emits a different module per build target so each side only loads what it needs.

See [SPEC.md](./SPEC.md) for the full design.

## Why

`"use client"` is whole-module, so it can't keep a tool's zod schema readable on
the server while keeping its `render` on the client. And a backend `execute`
holds secrets (DB handles, API keys) that must never reach the browser bundle.
`"use generative"` routes each property to the right place:

| `type`     | `description`/`properties` | `render` | `execute`                       |
| ---------- | -------------------------- | -------- | ------------------------------- |
| `frontend` | both                       | client   | client                          |
| `backend`  | both                       | client   | server (`server-only` guard)    |
| `human`    | both                       | client   | —                               |

## Authoring

```tsx
"use generative";
import { z } from "zod";
import { db } from "@/db"; // server-only
import { Chart } from "@/ui/chart"; // client-only

export default {
  weather: {
    type: "backend",
    description: "Show the weather for a city.",
    properties: z.object({ city: z.string() }),
    execute: async ({ city }) => db.weather.get(city), // stays on the server
    render: (props) => <Chart data={props} />, // stays on the client
  },
} satisfies Toolkit;
```

The server build of this file keeps `properties` + `execute` (guarded by
`import "server-only"`) and drops `render` and `@/ui/chart`. The client build
keeps `properties` + `render` (under `"use client"`) and drops `execute` and
`@/db`.

## Wiring into Next.js

Wrap your config. Detection is by the `"use generative"` directive — there is **no
filename convention**; modules without the directive pass through untouched.

```ts
// next.config.ts
import { withAui } from "@assistant-ui/next";

export default withAui({
  /* your Next config */
});
```

`withAui` applies the loader to your TS/TSX. To limit how many files it
scans, narrow the globs: `withAui(config, { rules: ["*.generative.tsx"] })`.

Import the **bare** path in client code (it gets the client build — render),
and add **`?generative=server`** in server code (it gets the server build —
`execute`):

```tsx
// a client component — render only
import toolkit from "@/lib/chat.generative";

// a route handler — schema + execute
import toolkit from "@/lib/chat.generative?generative=server";
```

Declare the query specifier for TypeScript (once):

```ts
declare module "*?generative=server" {
  const toolkit: import("@assistant-ui/react").Toolkit;
  export default toolkit;
}
```

With the AI SDK, convert the server build to a `ToolSet` (see
`generativeTools` in `@assistant-ui/react-ai-sdk`).

> **Validated on Next 16.2.6 (Turbopack).** Turbopack honors the loader-emitted
> `"use client"`, but compiles one output per resource path — so the server build
> is selected by its own `?generative=server` query rather than by build layer.
> Clear `.next` after changing the loader (Turbopack caches loader output). The
> compiler (`compileGenerative`) is bundler-agnostic and fully tested.

## Programmatic API

```ts
import { compileGenerative, resolveTarget } from "@assistant-ui/next";

const { code } = compileGenerative(source, { target: "server" }); // or "client"
```

## License

MIT
