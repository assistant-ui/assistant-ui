# @assistant-ui/next

## 0.0.4

### Patch Changes

- [#4178](https://github.com/assistant-ui/assistant-ui/pull/4178) [`70de5eb`](https://github.com/assistant-ui/assistant-ui/commit/70de5eb83a0543acd2f95d2a24f8d2f3a4f1e130) - fix: resolve type-check errors — `@assistant-ui/next` now extends the Node tsconfig so `node:path` resolves, and drop an unused import in `react-langgraph` ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: the `"use generative"` compiler now understands generative-UI libraries. It splits every `defineGenerativeComponents({ ... })` call (dropping each component's `render` and its client-only imports from the server build, keeping `properties` on both), unwraps the marker like `defineToolkit`, and processes multiple `defineToolkit`/`defineGenerativeComponents` calls anywhere in the module. A toolkit entry that is a method call on a `new JSONGenerativeUI(...)` instance (e.g. `generative.present()`) now passes through untouched — the library routes its halves via export conditions — while any other non-inline tool is still rejected. ([@Yonom](https://github.com/Yonom))

- [#4200](https://github.com/assistant-ui/assistant-ui/pull/4200) [`4853543`](https://github.com/assistant-ui/assistant-ui/commit/4853543ea7ea40f1b65efbb0211f73138aadd574) - fix(next): bust the `"use generative"` loader cache when the compiler changes. `withAui` now folds a token derived from `@assistant-ui/x-generative-compiler`'s version and dist mtime into the loader options, which Turbopack and webpack include in their transform cache key. Previously a change to the compiler (a published upgrade, or an in-place rebuild in a monorepo) could leave stale compiled `"use generative"` modules cached until `.next` was cleared. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab)]:
  - @assistant-ui/x-generative-compiler@0.0.3

## 0.0.3

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: add @assistant-ui/next — the `withAui()` Next.js config wrapper and the compiler for the `"use generative"` directive that colocates a tool's schema, server-only `execute`, and client-only `render` in one file ([@Yonom](https://github.com/Yonom))

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: extract the framework-agnostic `"use generative"` compiler into the internal `@assistant-ui/x-generative-compiler` package. `@assistant-ui/next` now consumes the shared compiler instead of bundling its own copy, so other build integrations can reuse it. ([@Yonom](https://github.com/Yonom))

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: move the `defineToolkit` and `hitl` use-generative markers from `@assistant-ui/next` into `@assistant-ui/core/react`, so they ship once from every distribution (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) and stay portable across build targets. Import them from `@assistant-ui/react` instead of `@assistant-ui/next`; they remain no-op markers stripped at build time by a `"use generative"` compiler. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - @assistant-ui/x-generative-compiler@0.0.2

## 0.0.2

### Patch Changes

- [#4172](https://github.com/assistant-ui/assistant-ui/pull/4172) [`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92) - feat: add @assistant-ui/next — the `withAui()` Next.js config wrapper, the `defineToolkit()` authoring helper, and the compiler for the `"use generative"` directive that colocates a tool's schema, server-only `execute`, and client-only `render` in one file ([@Yonom](https://github.com/Yonom))

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d)]:
  - @assistant-ui/core@0.2.8
