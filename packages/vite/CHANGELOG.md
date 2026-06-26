# @assistant-ui/vite

## 0.0.8

### Patch Changes

- Updated dependencies [[`ab217e4`](https://github.com/assistant-ui/assistant-ui/commit/ab217e49494d74e570d18ec73c21b7700f53df5a)]:
  - @assistant-ui/x-generative-compiler@0.0.8

## 0.0.7

### Patch Changes

- [#4608](https://github.com/assistant-ui/assistant-ui/pull/4608) [`a7b06f7`](https://github.com/assistant-ui/assistant-ui/commit/a7b06f76876078fc2fcbb92a86fa0e1530fde782) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`d162f44`](https://github.com/assistant-ui/assistant-ui/commit/d162f440502c29e4293e33c0c081e87c36d67bba)]:
  - @assistant-ui/x-generative-compiler@0.0.7

## 0.0.6

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff), [`32f1b05`](https://github.com/assistant-ui/assistant-ui/commit/32f1b0528a080bc247655aac8bae19d8bcfc4cfa), [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0), [`048e20c`](https://github.com/assistant-ui/assistant-ui/commit/048e20ce1b69142f843952b8ce7fb6f6d330fd6a), [`056eea8`](https://github.com/assistant-ui/assistant-ui/commit/056eea856f99172cc222e83c1a4f839fef20bfe8)]:
  - @assistant-ui/x-generative-compiler@0.0.6

## 0.0.5

### Patch Changes

- [#4393](https://github.com/assistant-ui/assistant-ui/pull/4393) [`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d) - fix: resolve typecheck regressions ([@Yonom](https://github.com/Yonom))

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668)]:
  - @assistant-ui/x-generative-compiler@0.0.5

## 0.0.4

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4256](https://github.com/assistant-ui/assistant-ui/pull/4256) [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60) - feat: rename hitlTool to humanTool while keeping deprecated compatibility aliases ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`40813e6`](https://github.com/assistant-ui/assistant-ui/commit/40813e6402a5c97ccbc743924dffc65a89c99ec6), [`7d2b2b7`](https://github.com/assistant-ui/assistant-ui/commit/7d2b2b7f61311df0d975e19378671ffd683c9e1c), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`451c191`](https://github.com/assistant-ui/assistant-ui/commit/451c19112325dc3a03d42feafdcad889db77ce66)]:
  - @assistant-ui/x-generative-compiler@0.0.4

## 0.0.3

### Patch Changes

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: the `"use generative"` compiler now understands generative-UI libraries. It splits every `defineGenerativeComponents({ ... })` call (dropping each component's `render` and its client-only imports from the server build, keeping `properties` on both), unwraps the marker like `defineToolkit`, and processes multiple `defineToolkit`/`defineGenerativeComponents` calls anywhere in the module. A toolkit entry that is a method call on a `new JSONGenerativeUI(...)` instance (e.g. `generative.present()`) now passes through untouched — the library routes its halves via export conditions — while any other non-inline tool is still rejected. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb)]:
  - @assistant-ui/x-generative-compiler@0.0.3

## 0.0.2

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: add @assistant-ui/vite — a Vite plugin (`aui()`) that compiles the `"use generative"` directive for Vite apps and TanStack Start. It transforms each toolkit per Vite environment (`client` keeps `render`, server environments keep `execute`), so no facade/redirect is needed; it also skips the Next-only `server-only` import, which has no `react-server` layer under Vite. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - @assistant-ui/x-generative-compiler@0.0.2
