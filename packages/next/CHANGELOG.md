# @assistant-ui/next

## 0.0.10

### Patch Changes

- Updated dependencies [[`9caecdd`](https://github.com/assistant-ui/assistant-ui/commit/9caecddfc70e3c351ae6e9cc069be37b9f9f386b), [`ab217e4`](https://github.com/assistant-ui/assistant-ui/commit/ab217e49494d74e570d18ec73c21b7700f53df5a), [`fa083a4`](https://github.com/assistant-ui/assistant-ui/commit/fa083a47d4c4f37553a09b9f577793d363290146)]:
  - @assistant-ui/x-generative-compiler@0.0.8

## 0.0.9

### Patch Changes

- Updated dependencies [[`d162f44`](https://github.com/assistant-ui/assistant-ui/commit/d162f440502c29e4293e33c0c081e87c36d67bba)]:
  - @assistant-ui/x-generative-compiler@0.0.7

## 0.0.8

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff), [`32f1b05`](https://github.com/assistant-ui/assistant-ui/commit/32f1b0528a080bc247655aac8bae19d8bcfc4cfa), [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0), [`048e20c`](https://github.com/assistant-ui/assistant-ui/commit/048e20ce1b69142f843952b8ce7fb6f6d330fd6a), [`056eea8`](https://github.com/assistant-ui/assistant-ui/commit/056eea856f99172cc222e83c1a4f839fef20bfe8)]:
  - @assistant-ui/x-generative-compiler@0.0.6

## 0.0.7

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668)]:
  - @assistant-ui/x-generative-compiler@0.0.5

## 0.0.6

### Patch Changes

- [#4327](https://github.com/assistant-ui/assistant-ui/pull/4327) [`1437805`](https://github.com/assistant-ui/assistant-ui/commit/14378055bb24134a5256b3b2125a6fdc835b7bce) - fix: give each `"use generative"` module a distinct bundler-redirect identity so two toolkits in one app no longer collide under `next dev` ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

## 0.0.5

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4266](https://github.com/assistant-ui/assistant-ui/pull/4266) [`906fae9`](https://github.com/assistant-ui/assistant-ui/commit/906fae9f7fa6a8b022119c893e4f906f1b74dc60) - docs: reference `AISDKToolkit` instead of the deprecated `generativeTools` in the README ([@Yonom](https://github.com/Yonom))

- [#4256](https://github.com/assistant-ui/assistant-ui/pull/4256) [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60) - feat: rename hitlTool to humanTool while keeping deprecated compatibility aliases ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`40813e6`](https://github.com/assistant-ui/assistant-ui/commit/40813e6402a5c97ccbc743924dffc65a89c99ec6), [`7d2b2b7`](https://github.com/assistant-ui/assistant-ui/commit/7d2b2b7f61311df0d975e19378671ffd683c9e1c), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`451c191`](https://github.com/assistant-ui/assistant-ui/commit/451c19112325dc3a03d42feafdcad889db77ce66)]:
  - @assistant-ui/x-generative-compiler@0.0.4

## 0.0.4

### Patch Changes

- [#4178](https://github.com/assistant-ui/assistant-ui/pull/4178) [`70de5eb`](https://github.com/assistant-ui/assistant-ui/commit/70de5eb83a0543acd2f95d2a24f8d2f3a4f1e130) - fix: resolve type-check errors — `@assistant-ui/next` now extends the Node tsconfig so `node:path` resolves, and drop an unused import in `react-langgraph` ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: the `"use generative"` compiler now understands generative-UI libraries. It splits every `defineGenerativeComponents({ ... })` call (dropping each component's `render` and its client-only imports from the server build, keeping `properties` on both), unwraps the marker like `defineToolkit`, and processes multiple `defineToolkit`/`defineGenerativeComponents` calls anywhere in the module. A toolkit entry that is a method call on a `new JSONGenerativeUI(...)` instance (e.g. `generative.present()`) now passes through untouched — the library routes its halves via export conditions — while any other non-inline tool is still rejected. ([@Yonom](https://github.com/Yonom))

- [#4200](https://github.com/assistant-ui/assistant-ui/pull/4200) [`4853543`](https://github.com/assistant-ui/assistant-ui/commit/4853543ea7ea40f1b65efbb0211f73138aadd574) - fix(next): bust the `"use generative"` loader cache when the compiler changes. `withAui` now folds a token derived from `@assistant-ui/x-generative-compiler`'s version and dist mtime into the loader options, which Turbopack and webpack include in their transform cache key. Previously a change to the compiler (a published upgrade, or an in-place rebuild in a monorepo) could leave stale compiled `"use generative"` modules cached until `.next` was cleared. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb)]:
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
