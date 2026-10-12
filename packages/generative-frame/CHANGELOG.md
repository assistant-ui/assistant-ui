# generative-frame

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
