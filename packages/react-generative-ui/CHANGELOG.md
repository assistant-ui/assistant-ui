# @assistant-ui/react-generative-ui

## 0.0.6

### Patch Changes

- [#4605](https://github.com/assistant-ui/assistant-ui/pull/4605) [`d592c85`](https://github.com/assistant-ui/assistant-ui/commit/d592c854d5fb2771d457167f9fa3542958678474) - add the react-free `./ir` subpath carrying the flat `$type` generative-ui IR: `UINode`, `UIElement`, `LegacyComponentNode`, `Action`, `UISpec`, the canonical `NormalizedUINode`/`NormalizedUIElement`, and `normalizeUINode`/`normalizeSpec`. `normalizeUINode` accepts the flat `$type` shape and the legacy `component` shape, strips the reserved `$`-prefixed keys (`$type`, `$key`, `$action`) and `children` from the component prop bag, and threads a streaming `partialPath` so a node whose `$type` is still mid-arrival is held back. the package's existing generative-ui types are rebased onto `./ir`: `GenerativeUIElement` is now an alias of `NormalizedUIElement` (with `children` lifted to a reserved top-level key instead of living in `props`), `GenerativeUINode`/`GenerativeUIProps`/`GenerativeUIAction` alias the `./ir` types, and `renderGenerativeUI` consumes `NormalizedUINode` directly. the wire format is unchanged (`$type` already shipped); the `GenerativeUI*` export names are kept so the surface stays append-only. the ui token enums (`TextSize`/`Color`/`Align`/...) are deferred to the PR that introduces the closed vocabulary that consumes them, so this PR's surface is only what the renderer uses. core is not touched. ([@okisdev](https://github.com/okisdev))

- [#4607](https://github.com/assistant-ui/assistant-ui/pull/4607) [`8a2b9cb`](https://github.com/assistant-ui/assistant-ui/commit/8a2b9cb7dead677aa802335132bc588a03998896) - add the closed generative-ui vocabulary as a published default `GenerativeUILibrary` (`defaultGenerativeUILibrary`) plus the ui token enums (`TextSize`, `ImageSize`, `Weight`, `Color`, `Align`, `Justify`, `ButtonStyle`, `AlertTone`) that PR [#4605](https://github.com/assistant-ui/assistant-ui/issues/4605) deferred. the vocabulary covers the portable core (`Header`, `Text`, `Caption`, `Fact`, `Image`, `Divider`, `Button`, `Select`, `Input`, `DatePicker`, `Alert`, `Carousel`), layout (`Card`, `Col`, `Row`, `Spacer`, `Badge`), and data (`Table`, `Markdown`, `Chart`) — 20 components total. each component is a zod `properties` schema plus an unstyled structural `render` that emits semantic HTML with a `data-aui="<component>"` attribute and `data-aui-<prop>` hooks for the host to style (no tailwind, no `@assistant-ui/ui` dependency). `Text`/`Caption`/`Markdown` opt into `streamProperties` so they render partial content while streaming. interactive components (`Button`/`Select`/`Input`/`DatePicker`) carry `$action`, now re-injected into `render` props and stashed on a `data-aui-action` attribute; dispatch is a follow-up. users opt in via `new JSONGenerativeUI({ library: defaultGenerativeUILibrary })` and override entries with their own `defineGenerativeComponents`. ([@okisdev](https://github.com/okisdev))

- [#4600](https://github.com/assistant-ui/assistant-ui/pull/4600) [`c08260c`](https://github.com/assistant-ui/assistant-ui/commit/c08260c66e58b557f4c36126292aadad1434c18b) - fix: align assistant-stream dependency range with lockfile ([@Yonom](https://github.com/Yonom))

- [#4597](https://github.com/assistant-ui/assistant-ui/pull/4597) [`23d4d22`](https://github.com/assistant-ui/assistant-ui/commit/23d4d2230361c2f285d9fcd9863717a336ba4a23) - fix: avoid unresolved self-import build warning ([@Yonom](https://github.com/Yonom))

## 0.0.6

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff)]:
  - assistant-stream@0.3.24

## 0.0.5

### Patch Changes

- [#4393](https://github.com/assistant-ui/assistant-ui/pull/4393) [`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d) - fix: resolve typecheck regressions ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d)]:
  - assistant-stream@0.3.23

## 0.0.4

### Patch Changes

- [#4344](https://github.com/assistant-ui/assistant-ui/pull/4344) [`d51fe1c`](https://github.com/assistant-ui/assistant-ui/commit/d51fe1cd216827f98bb8080284f49e23ed23276e) - fix: hold back nodes whose `$type` is still streaming instead of reporting them as unknown components ([@Yonom](https://github.com/Yonom))

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
