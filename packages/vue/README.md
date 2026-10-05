# `@assistant-ui/vue`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/vue)](https://www.npmjs.com/package/@assistant-ui/vue)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/vue)](https://www.npmjs.com/package/@assistant-ui/vue)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)
![License](https://img.shields.io/npm/l/@assistant-ui/vue)

Vue bindings for assistant-ui. A provider, composables, and unstyled primitives for streaming AI chat in Vue and Nuxt, running the same runtime as `@assistant-ui/react`.

## Installation

Requires Vue 3.5 or newer.

```bash
npm install @assistant-ui/vue @assistant-ui/ai-sdk ai react
```

`@assistant-ui/ai-sdk` connects the [AI SDK](https://ai-sdk.dev). It runs the AI SDK's chat state on the shared runtime, so it needs `react` installed even though React renders nothing.

## Usage

```vue
<!-- app/components/Assistant.client.vue -->
<script setup lang="ts">
import {
  AuiConfig,
  AuiProvider,
  ComposerPrimitiveInput,
  ComposerPrimitiveSend,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  ThreadPrimitiveViewport,
} from "@assistant-ui/vue";
import { AISDKChat } from "@assistant-ui/ai-sdk";

const config = AuiConfig({ threads: AISDKChat() });
</script>

<template>
  <AuiProvider :config="config">
    <ThreadPrimitiveViewport class="h-dvh overflow-y-auto">
      <ThreadPrimitiveMessages>
        <MessagePrimitiveParts />
      </ThreadPrimitiveMessages>
    </ThreadPrimitiveViewport>
    <ComposerPrimitiveInput placeholder="Message..." />
    <ComposerPrimitiveSend>Send</ComposerPrimitiveSend>
  </AuiProvider>
</template>
```

`AISDKChat()` posts to `/api/chat`, a route that returns `streamText(...).toUIMessageStreamResponse()`. Mount the provider client-only, as a `.client.vue` component in Nuxt: Vue's server renderer never disposes effect scopes, so a provider rendered on the server would keep one runtime per request.

Styled components (thread, messages, reasoning, tool calls, thread list) install from the assistant-ui registry; the [quickstart](https://www.assistant-ui.com/docs/vue/quickstart) walks through them.

## API

- `AuiProvider` owns an assistant client built from an `AuiConfig`; `AuiIf` renders its slot while a state selector returns true.
- `useAui()` returns a stable client whose scope accessors resolve to the provider's current client. `useAuiState(selector)` returns a computed ref that updates when the selected slice changes. `useAuiEvent(event, callback)` subscribes for the lifetime of the current effect scope.
- Primitives cover threads (`ThreadPrimitiveRoot`, `Messages`, `Viewport`, `ViewportFooter`, `ScrollToBottom`, `Suggestions`), messages (`MessagePrimitiveRoot`, `Parts`, `Attachments`), composers (`ComposerPrimitiveInput`, `Send`, `Cancel`, `Attachments`, `AddAttachment`, `AttachmentDropzone`), attachments, branch pickers, action bars, suggestions, errors, chain of thought, and thread lists, each exported under its full name such as `ThreadPrimitiveMessages`.
- Tool calls render through Vue components registered with `Tools({ toolkit })` or `aui.tools.setToolUI`, which receive a single `tool` prop typed `ToolUIProps`; a React renderer from a toolkit shared with a React app does not render in Vue.

## Without the AI SDK

To run a runtime that does not need React, such as one mounted with `RuntimeAdapter` from `@assistant-ui/core/store`, alias `react` to `@assistant-ui/tap/standalone-shim` so the shared runtime code resolves without React installed:

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      "react/compiler-runtime": "@assistant-ui/tap/standalone-shim/compiler-runtime",
      react: "@assistant-ui/tap/standalone-shim",
    },
  },
});
```

## Documentation

- [Getting Started](https://www.assistant-ui.com/docs/vue)
- [Quickstart](https://www.assistant-ui.com/docs/vue/quickstart)
- [Runtimes](https://www.assistant-ui.com/docs/vue/runtimes)
- [Server rendering](https://www.assistant-ui.com/docs/vue/ssr)
- [Tool UI](https://www.assistant-ui.com/docs/vue/tool-ui)

## For other platforms

- Web with React: [`@assistant-ui/react`](https://www.npmjs.com/package/@assistant-ui/react)
- React Native: [`@assistant-ui/react-native`](https://www.npmjs.com/package/@assistant-ui/react-native)
- Terminal: [`@assistant-ui/react-ink`](https://www.npmjs.com/package/@assistant-ui/react-ink)
