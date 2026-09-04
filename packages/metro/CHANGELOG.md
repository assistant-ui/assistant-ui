# @assistant-ui/metro

## 0.0.12

### Patch Changes

- [#6528](https://github.com/assistant-ui/assistant-ui/pull/6528) [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.11

### Patch Changes

- [#6445](https://github.com/assistant-ui/assistant-ui/pull/6445) [`d323dc8`](https://github.com/assistant-ui/assistant-ui/commit/d323dc82a86320be6581470b7b235b7f66b02265) - refactor: derive a bundled commonjs build mode from the exports map, and drop metro's private tsdown config. a package whose exports targets are .cjs files now builds as a bundled cjs/node artifact with declared dependencies external and workspace devDependencies inlined; metro's dist is byte-identical to what its per-package config produced. ([@okisdev](https://github.com/okisdev))

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6424](https://github.com/assistant-ui/assistant-ui/pull/6424) [`bb1e79a`](https://github.com/assistant-ui/assistant-ui/commit/bb1e79aef77b9c3519663e9dd5ffec6d60b5deb9) - refactor: share the generative source predicate across bundler integrations ([@okisdev](https://github.com/okisdev))

## 0.0.10

### Patch Changes

- [#6079](https://github.com/assistant-ui/assistant-ui/pull/6079) [`ce68614`](https://github.com/assistant-ui/assistant-ui/commit/ce68614d62215757ef485705353d0ddfe9b715e7) - feat: add a `backendless` compile option for apps without their own backend (e.g. cloud-hosted runs), keeping `"use generative"` frontend/human tool schemas and `JSONGenerativeUI` component-library schemas uploadable from the client instead of assuming the backend already knows them ([@Yonom](https://github.com/Yonom))

## 0.0.9

### Patch Changes

- [#5774](https://github.com/assistant-ui/assistant-ui/pull/5774) [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.8

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.7

### Patch Changes

- [#5430](https://github.com/assistant-ui/assistant-ui/pull/5430) [`dcacd9b`](https://github.com/assistant-ui/assistant-ui/commit/dcacd9bc45117f9beca698006fd67616d2c1ca61) - feat: AuiProvider extends/config grammar. `config={AuiConfig({...})}` alone creates a top-level root client; nested providers must pass `extends` — a client to extend, or `null` to isolate (dev-enforced). An empty config creates a client extending the `extends` client; `ref` exposes the resulting client. The `config` prop only accepts configs built with `AuiConfig(...)` (branded type). AssistantRuntimeProvider gains an optional `config` prop whose scopes are provided alongside the runtime scope. The `useAui({...})` extension overload and the AuiProvider `value` prop are deprecated; `value={client}` now exposes a client extending the given one (same scopes, new identity) rather than the exact instance. `useAui({})` with an empty scope object now mounts a rooted host (so the scope set can grow across renders) instead of a passthrough derived-only client. `useAuiState` state enumeration (`Object.keys`/spread) now includes scopes inherited from parent clients, matching `in`-operator behavior. Clients derived from a hand-built parent (a plain object with `subscribe`/`on`) forward scoped `on(...)` listeners to the parent's `on` instead of throwing for scopes the parent does not expose. ([@Yonom](https://github.com/Yonom))

## 0.0.6

### Patch Changes

- [#5079](https://github.com/assistant-ui/assistant-ui/pull/5079) [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.5

### Patch Changes

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4887](https://github.com/assistant-ui/assistant-ui/pull/4887) [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4887](https://github.com/assistant-ui/assistant-ui/pull/4887) [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4777](https://github.com/assistant-ui/assistant-ui/pull/4777) [`92d84cf`](https://github.com/assistant-ui/assistant-ui/commit/92d84cfb3ef443845787603bc11ef1aa6d73ba74) - chore: update TypeScript to 7 ([@Kinfe123](https://github.com/Kinfe123))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.4

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.3

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.2

### Patch Changes

- [#4265](https://github.com/assistant-ui/assistant-ui/pull/4265) [`40813e6`](https://github.com/assistant-ui/assistant-ui/commit/40813e6402a5c97ccbc743924dffc65a89c99ec6) - fix: bake the compiler version into the build so the core compatibility check works when the compiler is bundled ([@Yonom](https://github.com/Yonom))

  The core/compiler compatibility check found the compiler's version by walking up from `import.meta.url` to its own `package.json`. That works when the compiler is installed as a standalone package (Next.js and Vite import it externally), but `@assistant-ui/metro` bundles the compiler into `transformer.cjs`, so at runtime there is no separate `@assistant-ui/x-generative-compiler` on disk to walk up to. The check then threw `could not determine @assistant-ui/x-generative-compiler's package version` during Expo/Metro bundling. The version is now imported from `package.json`, so the literal is inlined at build time and survives being bundled. `@assistant-ui/metro` is bumped (it carries the compiler as a bundled devDependency, so it would not pick up the fix automatically) so its bundled transformer ships the fix.

- [#4267](https://github.com/assistant-ui/assistant-ui/pull/4267) [`7d2b2b7`](https://github.com/assistant-ui/assistant-ui/commit/7d2b2b7f61311df0d975e19378671ffd683c9e1c) - feat: merge toolkits across "use generative" files and allow a bare defineMcpToolkit default export ([@Yonom](https://github.com/Yonom))

  A `"use generative"` toolkit can now spread the default export of another `"use generative"` module, so tools can be split across files: `import weatherTools from "./tools/weather"; export default defineToolkit({ ...weatherTools })`. The compiler resolves the import (relative paths and `tsconfig` path aliases such as `@/tools/weather`) and confirms the source is itself `"use generative"` before allowing the spread, so a backend `execute` can't leak to the client. Only default imports qualify, since named exports don't survive the build-split generative-module boundary.

  `defineMcpToolkit({ ... })` is also now accepted directly as a file's default export, so an MCP-only toolkit no longer needs to be wrapped in an otherwise-empty `defineToolkit`.

  `@assistant-ui/metro` is bumped because it bundles the compiler and would not otherwise pick up the new behavior.

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4244](https://github.com/assistant-ui/assistant-ui/pull/4244) [`615a218`](https://github.com/assistant-ui/assistant-ui/commit/615a2185979648e404202e825cc43efb80cde2c4) - feat: add `@assistant-ui/metro` — the `"use generative"` directive compiler for Expo / React Native, so RN apps author tools with the same `defineToolkit` API as the web via `withAui` in `metro.config.js` ([@Yonom](https://github.com/Yonom))
