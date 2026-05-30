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
`"use generative"` routes each property to the right place.

Every tool **must** declare an `execute`, and you wrap the default export in
`defineToolkit({ ... })` (both are enforced — the compiler errors otherwise). You
don't declare a tool's kind: the compiler **infers** it from the `execute` and
writes a `type` field back into the output.

| how you author the `execute`              | kind       | where it runs                |
| ----------------------------------------- | ---------- | ---------------------------- |
| `execute` with a `"use client"` directive | `frontend` | client                       |
| `execute` (plain)                         | `backend`  | server (`server-only` guard) |
| `execute: hitl()`                         | `human`    | — (the UI supplies a result) |

A plain `execute` is server-only by default — you can only run one in the browser
by opting in with `"use client"`, so secrets can't leak by omission.

## Authoring

```tsx
"use generative";
import { z } from "zod";
import { defineToolkit } from "@assistant-ui/next";
import { db } from "@/db"; // server-only
import { Chart } from "@/ui/chart"; // client-only

export default defineToolkit({
  weather: {
    description: "Show the weather for a city.",
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => db.weather.get(city), // backend → stays on the server
    render: (props) => <Chart data={props} />, // stays on the client
  },
});
```

The server build keeps `parameters` + `execute` (guarded by `import
"server-only"`, tagged `type: "backend"`) and drops `render` and `@/ui/chart`.
The client build keeps `parameters` + `render` (under `"use client"`) and drops
`execute` and `@/db`. A `frontend` tool marks its `execute` with `"use client"`:

```tsx
execute: async ({ city }) => {
  "use client";
  return navigator.geolocation /* … runs in the browser, kept client-side */;
},
```

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

Import the module **bare** from both sides — the loader rewrites it into a facade
that resolves to the right build per layer (no query, no per-file config):

```tsx
// a client component → resolves to the client build (schema + render)
import toolkit from "@/lib/chat.generative";

// a route handler (react-server layer) → resolves to the server build (schema + execute)
import toolkit from "@/lib/chat.generative";
```

With the AI SDK, convert the server build to a `ToolSet` (see
`generativeTools` in `@assistant-ui/react-ai-sdk`).

> **Validated on Next 16.2.6 (Turbopack).** Turbopack honors the loader-emitted
> `"use client"`, but compiles one output per resource path — so the server build
> is selected by its own `?generative-env=server` query rather than by build layer.
> Clear `.next` after changing the loader (Turbopack caches loader output).

## License

MIT
