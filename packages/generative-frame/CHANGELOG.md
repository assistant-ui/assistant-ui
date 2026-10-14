# generative-frame

## 0.0.5

### Patch Changes

- [#9427](https://github.com/assistant-ui/assistant-ui/pull/9427) [`5113baa`](https://github.com/assistant-ui/assistant-ui/commit/5113baa64eb50e2b7be167323161bb173a19c610) - feat: with `render_spec` among the tools, `buildWidgetInstructions` and `useWidgetInstructions` tell the model when to answer in markdown, with a spec, or with a widget ([@okisdev](https://github.com/okisdev))

- [#9524](https://github.com/assistant-ui/assistant-ui/pull/9524) [`c5c4fdd`](https://github.com/assistant-ui/assistant-ui/commit/c5c4fddfb57aafc7ad3043d11fe1bb3cd773656b) - feat: a rendered UI can tell the model what the user chose. Specs gain the built-in actions `sendMessage` and `updateModelContext` (validated in every catalog, documented when `catalog.prompt({ hostApi })` says the host handles them, and reserved in `defineCatalog`), widget guidance documents `genframe.updateModelContext` behind `hostApi.modelContext`, and the assistant-ui toolkits handle both: what a UI shares goes into the system prompt of later requests, marked as data and capped at 4,000 characters, and is saved with the call's state so it survives a reload. `sendMessage` runs only from a user's event, never from `watch`, which action handlers can now tell apart through `kind` on their second argument. ([@okisdev](https://github.com/okisdev))

- [#9501](https://github.com/assistant-ui/assistant-ui/pull/9501) [`d30dae6`](https://github.com/assistant-ui/assistant-ui/commit/d30dae602477a50ace87710e27b06c3faf2a6e59) - feat: add `$calc` formulas to spec expressions, so a spec can compute totals, quantities that follow an input, and formatted values from its state. Formulas are parsed by a bounded interpreter (no `eval`), give `null` instead of throwing, and `validateSpec` reports one that does not parse as `invalid-formula`. The spec guidance and the format rules now describe them, and a pointer into an array reads only the array's own items. ([@okisdev](https://github.com/okisdev))

- [#9455](https://github.com/assistant-ui/assistant-ui/pull/9455) [`986d7cf`](https://github.com/assistant-ui/assistant-ui/commit/986d7cffa2e9cde3c262e5798de62e4b6618479c) - Require explicit `fontStyleOrigins` and `fontOrigins` options for external font providers such as Google Fonts. An empty CDN allowlist now blocks external stylesheets and font files unless their resource origins are configured. ([@Yonom](https://github.com/Yonom))

- [#9318](https://github.com/assistant-ui/assistant-ui/pull/9318) [`1de1657`](https://github.com/assistant-ui/assistant-ui/commit/1de16572935587752628401d7928ba7bf9932010) - feat: keep a widget's `genframe.setState` value across reloads in the assistant-ui toolkit, and seed a frame's state with `initialState` ([@okisdev](https://github.com/okisdev))

## 0.0.4

### Patch Changes

- [#9253](https://github.com/assistant-ui/assistant-ui/pull/9253) [`1a76908`](https://github.com/assistant-ui/assistant-ui/commit/1a76908402c56b9783f2a6b3eeff8081b94f3d78) - fix(generative-frame): pass an MCP Apps widget's `ui/initialize` params to a new `onInitialized` handler, including the display modes it declares ([@rupic-app](https://github.com/apps/rupic-app))

- [#9268](https://github.com/assistant-ui/assistant-ui/pull/9268) [`afb9ad2`](https://github.com/assistant-ui/assistant-ui/commit/afb9ad2d42e4178a51eadf1ef15ad9f25be9df57) - feat: add `unsafeShimDomain` to load the shim from a self-hosted domain, and `opaqueOrigin` in generative-frame to render widgets in a `null`-origin sandbox without a shim ([@Yonom](https://github.com/Yonom))

- [#9310](https://github.com/assistant-ui/assistant-ui/pull/9310) [`2b1e1f5`](https://github.com/assistant-ui/assistant-ui/commit/2b1e1f5f95cb4cca9a2d8001e1e3b1ac68e46a0f) - feat: render spec mode on React Native, where `generative-frame/spec/react` and `generative-frame/spec/assistant-ui` resolve to React Native builds through the `react-native` condition, with `react-native` and `@assistant-ui/react-native` as optional peers ([@okisdev](https://github.com/okisdev))

- [#9286](https://github.com/assistant-ui/assistant-ui/pull/9286) [`409b896`](https://github.com/assistant-ui/assistant-ui/commit/409b896bcc11d5b0420cd3bc83b5463046a43558) - fix: validate a patch-only `render_spec` call after a reload against the spec rendered from the thread ([@okisdev](https://github.com/okisdev))

- [#9296](https://github.com/assistant-ui/assistant-ui/pull/9296) [`984674e`](https://github.com/assistant-ui/assistant-ui/commit/984674e2e0ab454c166712900e2d225cc8bc1803) - feat: keep what the user changes in a rendered spec across reloads in the assistant-ui toolkit, on the web and on React Native, and let a spec state store list and restore its writes ([@okisdev](https://github.com/okisdev))

- [#9287](https://github.com/assistant-ui/assistant-ui/pull/9287) [`1881261`](https://github.com/assistant-ui/assistant-ui/commit/1881261fd5d6605cbd1256af4f7c3547d9075d48) - feat: let assistant-ui specs read earlier tool results from state expressions ([@okisdev](https://github.com/okisdev))

- [#9288](https://github.com/assistant-ui/assistant-ui/pull/9288) [`a151d03`](https://github.com/assistant-ui/assistant-ui/commit/a151d031ca07b9441dcccbc9ad2b3f05970a648b) - feat: add `generative-frame/spec/vue`, a Vue renderer for spec mode, with `vue` as an optional peer ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`afb9ad2`](https://github.com/assistant-ui/assistant-ui/commit/afb9ad2d42e4178a51eadf1ef15ad9f25be9df57)]:
  - safe-content-frame@0.0.34

## 0.0.3

### Patch Changes

- [#9223](https://github.com/assistant-ui/assistant-ui/pull/9223) [`52e6257`](https://github.com/assistant-ui/assistant-ui/commit/52e625796b7f1cfe20f23a854c471d761c4d95e6) - fix(generative-frame): accept Standard Schema optional result members with undefined ([@rupic-app](https://github.com/apps/rupic-app))

## 0.0.2

### Patch Changes

- [#9103](https://github.com/assistant-ui/assistant-ui/pull/9103) [`6dd864b`](https://github.com/assistant-ui/assistant-ui/commit/6dd864b23bcc9290abcc68eb6b097ab99495d136) - feat: stream model-generated HTML and SVG widgets into Safe Content Frames with an MCP Apps-compatible host bridge, theme tokens, diagnostics, in-frame screenshots, per-id persistent storage, provider-agnostic widget tools, prompt guidance, and a repair loop; React bindings and an assistant-ui toolkit; and a declarative spec mode in separate entry points (`generative-frame/spec`, `/spec/react`, `/spec/tools`, `/spec/assistant-ui`) that never bundles the frame ([@Yonom](https://github.com/Yonom))
