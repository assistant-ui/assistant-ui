# @assistant-ui/react-generative-ui

## 0.0.3

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc)]:
  - assistant-stream@0.3.21

## 0.0.2

### Patch Changes

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: add `defineGenerativeComponents()` and split `JSONGenerativeUI` across builds. Author a component library with `defineGenerativeComponents({ ... })` (each entry colocates its `properties` schema with its `render`), pass it as `new JSONGenerativeUI({ library })`, and expose tools with `present()` and the new human-in-the-loop `promptUser()` inside a `defineToolkit`. The package now ships dual `JSONGenerativeUI` builds via the `react-server`/`default` export conditions (re-exported from the internal `./internal-json` subpath): the server build of `present`/`prompt_user` carries only `type`/`description`/`parameters`, and the client build adds `render`/`execute`. `present` is a frontend tool (it accepts `{ display }` to render standalone); `promptUser` is a human-in-the-loop tool. ([@Yonom](https://github.com/Yonom))

- [#4226](https://github.com/assistant-ui/assistant-ui/pull/4226) [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0) - fix: avoid uploading backend-default schemas for use-generative frontend and human tools ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: add new @assistant-ui/react-generative-ui package ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`606c9d4`](https://github.com/assistant-ui/assistant-ui/commit/606c9d41f515925ed531876d451e53a564cc4253), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb), [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d)]:
  - assistant-stream@0.3.20
  - @assistant-ui/react@0.14.14

## 0.0.1

### Patch Changes

- Initial package release
