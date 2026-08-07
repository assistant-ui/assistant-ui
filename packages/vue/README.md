# `@assistant-ui/vue`

> Not published yet. This package is the in-repo preview of the Vue bridge and stays private until the Vue integration is complete.

Vue bindings for assistant-ui. Bridges the framework-neutral `@assistant-ui/store` client into Vue via `<AuiProvider>`, `useAui`, `useAuiState`, and `useAuiEvent`.

The runtime layer runs on `@assistant-ui/tap`, a headless hooks runtime that needs no React renderer. Alias `react` to `@assistant-ui/tap/standalone-shim` in your bundler so the shared runtime code resolves without React installed:

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

## Usage

```vue
<!-- Root.vue -->
<script setup lang="ts">
import { AuiProvider, AuiConfig } from "@assistant-ui/vue";
import Composer from "./Composer.vue";
import { ComposerScope, ThreadScope } from "./scopes";

const config = AuiConfig({
  thread: ThreadScope(),
  composer: ComposerScope(),
});
</script>

<template>
  <AuiProvider :config="config"><Composer /></AuiProvider>
</template>
```

```vue
<!-- Composer.vue -->
<script setup lang="ts">
import { useAui, useAuiState } from "@assistant-ui/vue";

const aui = useAui();
const isRunning = useAuiState((s) => s.thread.isRunning);
</script>

<template>
  <button :disabled="isRunning" @click="aui.composer.send()">Send</button>
</template>
```

`useAui` returns a stable client whose scope accessors always resolve to the provider's current client. `useAuiState` returns a computed ref that updates when the selected slice changes by `Object.is`. `useAuiEvent` subscribes to assistant events for the lifetime of the current effect scope.

## Primitives

Headless components for runtime-backed threads, mirroring the React primitives. Mount a runtime with `RuntimeAdapter` from `@assistant-ui/core/store` and compose:

- `ThreadPrimitiveMessages` renders its default slot once per thread message, each instance scoped through `MessageByIndexProvider` (descendants read `s.message` and the message's edit composer as `s.composer`).
- `ComposerPrimitiveInput` is a textarea bound to the composer text; Enter submits, Shift+Enter inserts a newline, IME composition is ignored.
- `ComposerPrimitiveSend` and `ComposerPrimitiveCancel` are buttons wired to the composer with the same disabled semantics as the React primitives.
- `ThreadPrimitiveViewport` is a scroll container that keeps the thread pinned to the bottom while the user is at the bottom, scrolls down on run start, and unpins when the user scrolls up.
- `MessagePrimitiveParts` renders the current message's content parts, each scoped through `PartByIndexProvider`; a slot named after the part type overrides its rendering, and text parts render their text by default.
- `BranchPickerPrimitivePrevious`/`Next`/`Number`/`Count` navigate and display message branches.
- `AuiIf` renders its slot while a state selector returns true.

```vue
<script setup lang="ts">
import {
  ComposerPrimitiveInput,
  ComposerPrimitiveSend,
  ThreadPrimitiveMessages,
} from "@assistant-ui/vue";
import ChatMessage from "./ChatMessage.vue";
</script>

<template>
  <ol>
    <ThreadPrimitiveMessages>
      <ChatMessage />
    </ThreadPrimitiveMessages>
  </ol>
  <ComposerPrimitiveInput placeholder="Say something" />
  <ComposerPrimitiveSend>Send</ComposerPrimitiveSend>
</template>
```

`examples/with-vue/src/Root.vue` shows the RuntimeAdapter mount this composes with.

See `examples/with-vue` in the repository for a complete Vite setup.
