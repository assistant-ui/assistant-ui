# `"use generative"` — build selection design

How one **bare import** of a generative module resolves to the server build in
route handlers and the client build in the browser, with `server-only` intact and
no per-app setup. Validated end-to-end on Next 16.2.6 + Turbopack (May 2026).

## The two consumers

A generative module forks into a **client build** (schema + `render`, `"use
client"`) and a **server build** (schema + `execute`, `import "server-only"`).
Two consumers import it:

- the **route handler** (App Router) — needs `execute`;
- a **client component** (tool-UI registration) — needs `render` + schema, and
  its **SSR pass must resolve to the same build as the browser** or React throws
  a hydration mismatch (#418).

## Verified layer map

| layer | `browser` cond | `react-server` cond |
| --- | --- | --- |
| RSC server component (`rsc`) | OFF | **ON** |
| App Router route handler | OFF | **ON** |
| client component, SSR pass (`ssr`) | OFF | OFF |
| client component, browser (`app-pages-browser`) | **ON** | OFF |

The `react-server` condition is **ON in exactly the layers that need the server
build** (RSC + route handlers) and **OFF where the client build is needed** (SSR
+ browser) — and SSR matches the browser, so there is no hydration mismatch. This
is also why `server-only` (`{"react-server":"./empty.js","default":"./index.js"}`,
where the default throws) is safe only in react-server layers.

## How selection happens (no query, no `imports` field)

The loader rewrites a **bare** generative import into a facade that delegates
selection to a `react-server`-conditioned package subpath, passing the module's
own path through a **Turbopack import attribute** (a `?path=` query cannot ride a
package specifier; `with {}` can):

```js
// facade — emitted in place of a bare import of the generative module
import toolkit from "@assistant-ui/use-generative/generative"
  with { turbopackLoader: "@assistant-ui/use-generative/loader",
         turbopackLoaderOptions: "{\"path\":\"/abs/docs-toolkit.tsx\"}" };
export default toolkit;
```

`@assistant-ui/use-generative/generative` resolves by condition to one of two
indirection modules, which the loader (applied via the attribute) replaces with a
re-export of the concrete build — using a **relative** specifier computed from the
indirection's own path to the originating module (Turbopack won't resolve an
absolute specifier; a relative one is correct for both workspace symlinks and
installed packages):

```js
// react-server → generative-server.js  ⇒  emitted:
export { default } from "../../../app/lib/docs-toolkit.tsx?generative=server";
// default       → generative-client.js  ⇒  emitted:
export { default } from "../../../app/lib/docs-toolkit.tsx?generative=client";
```

The `?generative=server|client` query then hits the loader again and compiles the
concrete build. Net resolution from one bare import:

- route handler / RSC (`react-server` ON) → **server build** (execute + `server-only`);
- SSR + browser (`react-server` OFF) → **client build** (render);
- everything is **static** (no top-level await), and the server build is only ever
  resolved in react-server layers, so `server-only` never enters the SSR/client
  graph and secrets never reach the browser.

## Verified (docs app)

- Browser bundle: no `server-only`, none of the server `execute` functions — **no leak**.
- Server bundle: the `execute` functions are present — server build wired.
- Page load: no hydration mismatch (clean browser console).

## Loader dispatch

1. resolution is a package **indirection** module → re-export the chosen concrete
   build (path from loader options, made relative);
2. `?generative=client|server` query → compile that build;
3. bare generative module → emit the facade;
4. anything else → passthrough.

## Rejected alternatives

- **`browser` loader condition** to fork directly: the SSR pass is `{not:browser}`,
  so a client component's SSR gets the server build → #418 + `server-only` build
  error. (`browser` is fine for a *pure-server* consumer, not a client-consumed
  module.)
- **Runtime `isServer` facade** (`if (isServer) import(server)`): can't prune, and
  `server-only`'s build-time check follows the dynamic `import()` into the
  client/SSR graph and errors.
- **`?path=` query on the package specifier**: Turbopack can't resolve a query on
  a package import (`Can't resolve '@pkg/generative'`); hence the `with {}` attribute.
- **package.json `imports` field**: works (resolve-time `react-server`), but
  requires a per-app entry; the facade removes that.

## Bundler support

Turbopack only — the facade uses Turbopack import attributes (`turbopackLoader`).
Under webpack, import the concrete builds explicitly (`?generative=server|client`).

## Notes

- `@assistant-ui/use-generative/env` exports `isServer` (react-server-conditioned).
  It is **not used** by the facade above; it remains as a runtime guard primitive
  (e.g. `if (!isServer) throw` inside an `execute`).
