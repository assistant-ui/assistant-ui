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

## How selection happens (no `imports` field)

The loader rewrites a **bare** generative import into a facade that delegates
selection to a `react-server`-conditioned package subpath, passing the module's
own path through a **Turbopack import attribute** (a `?path=` query cannot ride a
package specifier; `with {}` can). The subpath carries a **per-module token** so
each generative module gets its own indirection identity (see "Per-module
identity" below):

```js
// facade — emitted in place of a bare import of the generative module
import toolkit from "@assistant-ui/next/bundler-redirect/<token>"
  with { turbopackLoader: "@assistant-ui/next/loader",
         turbopackLoaderOptions: "{\"path\":\"/abs/docs-toolkit.tsx\"}" };
export default toolkit;
```

`@assistant-ui/next/bundler-redirect/<token>` resolves through the package's
`"./bundler-redirect/*"` export by condition to one of two indirection modules,
which the loader (applied via the attribute) replaces with a re-export of the
concrete build — using a **relative** specifier computed from the indirection's
own path to the originating module (Turbopack won't resolve an absolute
specifier; a relative one is correct for both workspace symlinks and installed
packages):

```js
// react-server → bundler-redirect.server.js?aui=<token>  ⇒  emitted:
export { default } from "../../../app/lib/docs-toolkit.tsx?generative-env=server";
// default       → bundler-redirect.client.js?aui=<token>  ⇒  emitted:
export { default } from "../../../app/lib/docs-toolkit.tsx?generative-env=client";
```

## Per-module identity

Turbopack keys runtime modules by **resolved path (+ query)**, ignoring loader
options and import attributes. A shared bare `@assistant-ui/next/bundler-redirect`
would therefore resolve every facade to the one `bundler-redirect.client.js` file
under a single key — so two generative modules register two indirection bodies
there and the last write wins, collapsing all imports onto whichever compiled
last (downstream: two `Tools` providers register the same toolkit → `tool …
already exists`). This only bites under `next dev`; a production `next build`
inlines the indirection per import site, so it resolves correctly.

So each facade imports `…/bundler-redirect/<token>`, where `<token>` is the
module's path encoded `base64url` (path-derived, so unique with no collisions;
it's already in the loader options, so it leaks nothing new). The wildcard export

```json
"./bundler-redirect/*": {
  "react-server": "./dist/bundler-redirect.server.js?aui=*",
  "default": "./dist/bundler-redirect.client.js?aui=*"
}
```

threads the token back as a `?aui=` **query on the resolved file**: both tokens
hit the same physical file, but the query makes each a distinct module key —
unique identity without per-module files, still selected by the static
`react-server` condition. The query is inert (`indirectionVariant` keys off the
basename; the path still arrives via the import attribute).

The `?generative-env=server|client` query then hits the loader again and compiles the
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
2. `?generative-env=client|server` query → compile that build;
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
- **A single shared `/bundler-redirect` subpath** for every module: collapses all
  generative imports onto one resolved module key — see "Per-module identity".
- **A query on the package specifier** (`…/bundler-redirect?aui=<token>`): still
  fails to resolve in Next 16.2.7 (`Can't resolve '@pkg/bundler-redirect'`), same
  as the old `?path=` attempt. A query only survives on a *resolved file* path,
  which is why the per-module token rides the wildcard-export **target** query
  (`…client.js?aui=*`) rather than the request.
- **Per-module physical indirection files** (the other route to distinct resolved
  paths): the set of generative modules isn't known when the package is built, so
  pre-shipping a file per module is impossible — the wildcard-target query gives
  distinct keys off one real file instead.
- **package.json `imports` field**: works (resolve-time `react-server`), but
  requires a per-app entry; the facade removes that.

## Bundler support

Turbopack only — the facade uses Turbopack import attributes (`turbopackLoader`).
Under webpack, import the concrete builds explicitly (`?generative-env=server|client`).
