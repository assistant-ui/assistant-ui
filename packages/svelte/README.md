# @assistant-ui/svelte

Svelte bindings for assistant-ui. Private and incomplete while the Svelte line is under development.

The package is plain TypeScript over `@assistant-ui/store/client` and Svelte's runtime APIs; it ships no compiled Svelte components. Svelte apps alias `react` to tap's standalone shim so the store chain loads without React:

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^react\/compiler-runtime$/,
        replacement: "@assistant-ui/tap/standalone-shim/compiler-runtime",
      },
      { find: /^react$/, replacement: "@assistant-ui/tap/standalone-shim" },
    ],
  },
});
```

## Usage

```svelte
<script lang="ts">
  import { provideAui, useAuiState } from "@assistant-ui/svelte";
  import { AuiConfig } from "@assistant-ui/store/client";

  const aui = provideAui(() => AuiConfig({ ... }));
  const isRunning = useAuiState((s) => s.thread.isRunning);
</script>

<button disabled={isRunning.current} onclick={() => aui.composer.send()}>
  Send
</button>
```

`provideAui` creates the client and provides it to the subtree (call it during component initialization; pass a thunk for a live config). `useAui` returns the stable client facade, `useAuiState` returns a reactive `current` getter over a state slice, and `useAuiEvent` subscribes to assistant events for the component's lifetime.
