# `"use generative"` — specification

## Problem

A tool has three regions of code with three different deployment targets:

| region                      | server (registration + agent loop) | client (browser) |
| --------------------------- | ---------------------------------- | ---------------- |
| `description` / `properties`| needed (→ LLM, parse)              | needed (→ parse) |
| `render`                    | **must not load** (React/CSS/DOM)  | needed           |
| `execute`                   | depends on kind (see routing)      | depends on kind  |

We want to **colocate all three in one source file** for DX, but keep `render`'s
client deps out of the server bundle and — more importantly — keep a backend
`execute`'s server deps (DB handles, API keys, server SDKs) out of the **client**
bundle. The second direction is a *security* boundary, not just bundle hygiene.

`"use client"` cannot express this: it is whole-module, so a `"use client"`
generative module would also turn `properties` into a client reference on the server,
making the zod schema unreadable server-side. We need **sub-module, per-property**
routing. That is what the `"use generative"` directive provides.

## The directive

A module opts in with a leading directive and a single default export wrapped in
`defineToolkit`:

```tsx
"use generative";
import { z } from "zod";
import { defineToolkit } from "@assistant-ui/next";
import { db } from "@/db"; // server-only dependency
import { Chart } from "@/ui/chart"; // client-only dependency

export default defineToolkit({
  weather: {
    description: "Show the weather for a city.",
    properties: z.object({ city: z.string() }),
    execute: async ({ city }) => db.weather.get(city), // backend (server-only)
    render: (props) => <Chart data={props} />, // client-only
  },
});
```

The file is imported from both server and client code; the compiler emits a
different module per build target so each side only loads what it needs.

## Routing (by inferred kind)

A tool's kind is **not authored** — declaring a `type` field is a type error. The
compiler infers it from the `execute` and writes the resolved `type` back into
each emitted tool object (so the runtime keeps it):

| how it's authored                         | inferred kind | `render` | `execute`                        |
| ----------------------------------------- | ------------- | -------- | -------------------------------- |
| `execute` with a `"use client"` directive | `frontend`    | client   | **client** (bundled with render) |
| `execute` (plain)                         | `backend`     | client   | **server** (`server-only` leaf)  |
| `execute: hitl()`                         | `human`       | client   | — (dropped; the UI resolves it)  |

Consequences:

- For `frontend` entries the server keeps **schema only** — render *and* execute
  are client concerns.
- `backend` is the only kind that produces the server-only secrets boundary; its
  `execute` leaf imports `server-only`, so any routing mistake that pulls it into
  the client build fails the build instead of leaking secrets.
- **Server-by-default is the safe default:** a plain `execute` stays server-only,
  so a forgotten marker can't leak — you opt *into* the client with `"use client"`.
  A frontend `execute`'s `"use client"` is stripped from the output (the module
  already carries it).

## Compile targets

The compiler produces two self-contained rewrites of the source, selected by the
bundler per build layer. Each rewrite keeps only the relevant regions and prunes
the imports that became unused, so a dropped region's dependencies disappear.

### `client` target

- Keep `description`, `properties`, `render`, and `execute` of `frontend` tools.
- Drop `execute` of `backend` tools (and its now-unused imports).
- Prepend `"use client"` when any `render` remains.

### `server` target

- Keep `description`, `properties`, and `execute` of `backend` tools.
- Drop every `render` (and its now-unused imports).
- Drop `execute` of `frontend` tools.
- Prepend `import "server-only"` when any backend `execute` remains.

The `"use generative"` directive is stripped from both outputs.

## Bundler integration

Wrap the Next config with `withAui` from `@assistant-ui/next`
(no filename convention — modules are matched by the `"use generative"` directive,
and the loader passes non-generative files through untouched). It applies `./loader`,
a webpack/Turbopack loader.

The loader chooses the target from an explicit `?generative-env=client|server` resource
query, defaulting to **`client`**:

- **bare import** (`import x from "./x.generative"`) → client build; safe in any
  layer (it has no `server-only` code).
- **`?generative-env=server`** (`import x from "./x.generative?generative-env=server"`) → server
  build; use in route handlers / server modules.

Why not infer the target from the build **layer**? Turbopack compiles one output
per resource path and does not give a loader a per-layer module instance, so a
layer-based default leaks a `server-only` module into client graphs the moment
any server module imports the bare path. Defaulting to the safe client build and
opting into the server build through its own resource query keeps the two builds
as distinct modules. (Clear `.next` after changing the loader — Turbopack caches
loader output aggressively.)

For TypeScript, declare the query specifier once so the import resolves:

```ts
declare module "*?generative-env=server" {
  const toolkit: import("@assistant-ui/react").Toolkit;
  export default toolkit;
}
```

## Consumption (the `present()` split)

The two sides are consumed at the two sites that already differ:

- **server:** import `./x.generative?generative-env=server` (schema + `execute`) and hand
  it to the model. With the AI SDK, `generativeTools({ toolkit, frontendTools })`
  from `@assistant-ui/react-ai-sdk` converts it into a `ToolSet` whose `execute`
  runs in the route, and merges in the frontend-uploaded tools.
- **client:** import the bare `./x.generative` (schema + `render`) and register its
  tool UI.

Neither side ships the other's code, and the schema is never re-uploaded from
the client per request — the server owns it.

## Authoring constraints (enforced, with errors)

1. A leading `"use generative"` directive.
2. A single `export default defineToolkit({ ... })` (the wrapper is required;
   optionally inside `satisfies` / `as`). No other exports.
3. Every tool must declare an `execute`. Its form determines the kind: `hitl()`
   → human; a leading `"use client"` directive → frontend (needs a block body,
   not an expression body); otherwise backend. `type` is never authored.
4. `render` / `execute` must be inline functions that close over **module
   imports only**, so they can be routed/pruned without dragging local scope.

## Known limitations (v1)

- Bare side-effect imports (e.g. `import "./styles.css"`) cannot be attributed to
  a region by reference analysis, so they are left untouched in both targets.
- Output preserves TS/JSX; the loader must run before the bundler's TS/JSX pass
  (the default in Next).
- Turbopack honors a loader-emitted `"use client"` directive (validated on Next
  16.2.6), but does not give a loader per-layer module instances — hence the
  `?generative-env=server` query rather than layer inference. Clear `.next` after
  changing the loader.
