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

See `examples/with-vue` in the repository for a complete Vite setup.
