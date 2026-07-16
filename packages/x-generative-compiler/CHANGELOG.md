# @assistant-ui/x-generative-compiler

## 0.0.9

### Patch Changes

- [#4583](https://github.com/assistant-ui/assistant-ui/pull/4583) [`a196108`](https://github.com/assistant-ui/assistant-ui/commit/a196108ee7771ce25eba3095f21f4868f5d4caab) - fix: recognize exported same-file toolkit fragments in toolkit spreads ([@Kinfe123](https://github.com/Kinfe123))

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4887](https://github.com/assistant-ui/assistant-ui/pull/4887) [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.8

### Patch Changes

- [#4629](https://github.com/assistant-ui/assistant-ui/pull/4629) [`9caecdd`](https://github.com/assistant-ui/assistant-ui/commit/9caecddfc70e3c351ae6e9cc069be37b9f9f386b) - fix: support exported module-scope JSONGenerativeUI instances ([@Kinfe123](https://github.com/Kinfe123))

- [#4610](https://github.com/assistant-ui/assistant-ui/pull/4610) [`ab217e4`](https://github.com/assistant-ui/assistant-ui/commit/ab217e49494d74e570d18ec73c21b7700f53df5a) - fix: name tools in missing toolkit member compiler errors ([@Kinfe123](https://github.com/Kinfe123))

- [#4632](https://github.com/assistant-ui/assistant-ui/pull/4632) [`fa083a4`](https://github.com/assistant-ui/assistant-ui/commit/fa083a47d4c4f37553a09b9f577793d363290146) - fix: validate JSONGenerativeUI constructor imports ([@Kinfe123](https://github.com/Kinfe123))

## 0.0.7

### Patch Changes

- [#4617](https://github.com/assistant-ui/assistant-ui/pull/4617) [`d162f44`](https://github.com/assistant-ui/assistant-ui/commit/d162f440502c29e4293e33c0c081e87c36d67bba) - fix: name opaque toolkit entries in compiler diagnostics ([@Kinfe123](https://github.com/Kinfe123))

## 0.0.6

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4560](https://github.com/assistant-ui/assistant-ui/pull/4560) [`32f1b05`](https://github.com/assistant-ui/assistant-ui/commit/32f1b0528a080bc247655aac8bae19d8bcfc4cfa) - fix: warn about duplicate tool names across generative toolkit spreads ([@Kinfe123](https://github.com/Kinfe123))

- [#4310](https://github.com/assistant-ui/assistant-ui/pull/4310) [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0) - feat: pass `unstable_interactableTool(...)` toolkit entries through `"use generative"` compilation — the client build keeps the config's `render`, the server build drops it ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4590](https://github.com/assistant-ui/assistant-ui/pull/4590) [`048e20c`](https://github.com/assistant-ui/assistant-ui/commit/048e20ce1b69142f843952b8ce7fb6f6d330fd6a) - fix: name duplicate providerTool config keys in compiler errors ([@Kinfe123](https://github.com/Kinfe123))

- [#4584](https://github.com/assistant-ui/assistant-ui/pull/4584) [`056eea8`](https://github.com/assistant-ui/assistant-ui/commit/056eea856f99172cc222e83c1a4f839fef20bfe8) - fix: avoid false positives when detecting use-generative directives ([@Kinfe123](https://github.com/Kinfe123))

## 0.0.5

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.4

### Patch Changes

- [#4255](https://github.com/assistant-ui/assistant-ui/pull/4255) [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676) - feat: check the generative compiler version against the core package compatibility range ([@Yonom](https://github.com/Yonom))

- [#4249](https://github.com/assistant-ui/assistant-ui/pull/4249) [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec) - feat: add externalTool for render-only generative toolkit entries ([@Yonom](https://github.com/Yonom))

- [#4265](https://github.com/assistant-ui/assistant-ui/pull/4265) [`40813e6`](https://github.com/assistant-ui/assistant-ui/commit/40813e6402a5c97ccbc743924dffc65a89c99ec6) - fix: bake the compiler version into the build so the core compatibility check works when the compiler is bundled ([@Yonom](https://github.com/Yonom))

  The core/compiler compatibility check found the compiler's version by walking up from `import.meta.url` to its own `package.json`. That works when the compiler is installed as a standalone package (Next.js and Vite import it externally), but `@assistant-ui/metro` bundles the compiler into `transformer.cjs`, so at runtime there is no separate `@assistant-ui/x-generative-compiler` on disk to walk up to. The check then threw `could not determine @assistant-ui/x-generative-compiler's package version` during Expo/Metro bundling. The version is now imported from `package.json`, so the literal is inlined at build time and survives being bundled. `@assistant-ui/metro` is bumped (it carries the compiler as a bundled devDependency, so it would not pick up the fix automatically) so its bundled transformer ships the fix.

- [#4267](https://github.com/assistant-ui/assistant-ui/pull/4267) [`7d2b2b7`](https://github.com/assistant-ui/assistant-ui/commit/7d2b2b7f61311df0d975e19378671ffd683c9e1c) - feat: merge toolkits across "use generative" files and allow a bare defineMcpToolkit default export ([@Yonom](https://github.com/Yonom))

  A `"use generative"` toolkit can now spread the default export of another `"use generative"` module, so tools can be split across files: `import weatherTools from "./tools/weather"; export default defineToolkit({ ...weatherTools })`. The compiler resolves the import (relative paths and `tsconfig` path aliases such as `@/tools/weather`) and confirms the source is itself `"use generative"` before allowing the spread, so a backend `execute` can't leak to the client. Only default imports qualify, since named exports don't survive the build-split generative-module boundary.

  `defineMcpToolkit({ ... })` is also now accepted directly as a file's default export, so an MCP-only toolkit no longer needs to be wrapped in an otherwise-empty `defineToolkit`.

  `@assistant-ui/metro` is bumped because it bundles the compiler and would not otherwise pick up the new behavior.

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4256](https://github.com/assistant-ui/assistant-ui/pull/4256) [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60) - feat: rename hitlTool to humanTool while keeping deprecated compatibility aliases ([@Yonom](https://github.com/Yonom))

- [#4254](https://github.com/assistant-ui/assistant-ui/pull/4254) [`451c191`](https://github.com/assistant-ui/assistant-ui/commit/451c19112325dc3a03d42feafdcad889db77ce66) - fix: omit externalTool entries from server toolkits ([@Yonom](https://github.com/Yonom))

## 0.0.3

### Patch Changes

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: the `"use generative"` compiler now understands generative-UI libraries. It splits every `defineGenerativeComponents({ ... })` call (dropping each component's `render` and its client-only imports from the server build, keeping `properties` on both), unwraps the marker like `defineToolkit`, and processes multiple `defineToolkit`/`defineGenerativeComponents` calls anywhere in the module. A toolkit entry that is a method call on a `new JSONGenerativeUI(...)` instance (e.g. `generative.present()`) now passes through untouched — the library routes its halves via export conditions — while any other non-inline tool is still rejected. ([@Yonom](https://github.com/Yonom))

- [#4226](https://github.com/assistant-ui/assistant-ui/pull/4226) [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0) - fix: avoid uploading backend-default schemas for use-generative frontend and human tools ([@Yonom](https://github.com/Yonom))

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4214](https://github.com/assistant-ui/assistant-ui/pull/4214) [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46) - feat: add renderText helpers for tool call status text ([@Yonom](https://github.com/Yonom))

- [#4236](https://github.com/assistant-ui/assistant-ui/pull/4236) [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb) - feat: add `stubTool()` and experimental `useAuiToolOverrides()` for locally executed generative toolkit tools ([@Yonom](https://github.com/Yonom))

## 0.0.2

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: extract the framework-agnostic `"use generative"` compiler into the internal `@assistant-ui/x-generative-compiler` package. `@assistant-ui/next` now consumes the shared compiler instead of bundling its own copy, so other build integrations can reuse it. ([@Yonom](https://github.com/Yonom))
