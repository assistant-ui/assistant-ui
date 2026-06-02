# @assistant-ui/x-generative-compiler

## 0.0.3

### Patch Changes

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: the `"use generative"` compiler now understands generative-UI libraries. It splits every `defineGenerativeComponents({ ... })` call (dropping each component's `render` and its client-only imports from the server build, keeping `properties` on both), unwraps the marker like `defineToolkit`, and processes multiple `defineToolkit`/`defineGenerativeComponents` calls anywhere in the module. A toolkit entry that is a method call on a `new JSONGenerativeUI(...)` instance (e.g. `generative.present()`) now passes through untouched — the library routes its halves via export conditions — while any other non-inline tool is still rejected. ([@Yonom](https://github.com/Yonom))

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

## 0.0.2

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: extract the framework-agnostic `"use generative"` compiler into the internal `@assistant-ui/x-generative-compiler` package. `@assistant-ui/next` now consumes the shared compiler instead of bundling its own copy, so other build integrations can reuse it. ([@Yonom](https://github.com/Yonom))
