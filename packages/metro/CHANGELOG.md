# @assistant-ui/metro

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
