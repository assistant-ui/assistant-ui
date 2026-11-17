# @assistant-ui/solid

Solid bindings for assistant-ui. Private and incomplete while the Solid line is under development.

The package is plain TypeScript over `@assistant-ui/store/client` and Solid's runtime APIs; it ships no JSX, so it needs no Solid compiler step of its own. Solid apps alias `react` to tap's standalone shim so the store chain loads without React:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [solid()],
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

```tsx
import { AuiConfig, AuiProvider, useAui, useAuiState } from "@assistant-ui/solid";

const SendButton = () => {
  const aui = useAui();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  return (
    <button disabled={isRunning()} onClick={() => aui.composer.send()}>
      Send
    </button>
  );
};

export const App = () => (
  <AuiProvider config={AuiConfig({ ... })}>
    <SendButton />
  </AuiProvider>
);
```

`AuiProvider` creates the client and provides it to the subtree; its `config` prop is live, and under a parent provider `extends` is mandatory (`extends={aui}` to inherit, `extends={null}` to isolate). `useAui` returns the stable client facade, `useAuiState` returns an accessor over a state slice that updates when the slice changes by `Object.is`, and `useAuiEvent` subscribes to assistant events until its owner is disposed. Render conditionally with Solid's `<Show when={...}>` over a `useAuiState` accessor.

On the server, `AuiProvider` renders the client's initial state without subscribing or mounting runtime effects, then destroys the client when Solid disposes the render root. On the client, the provider and event subscriptions start in Solid's `onMount`, after the initial render, so hydration reads the same initial state as the server. Accessors then reflect the mounted state, and state-changing actions can run from `onMount` or event handlers.
