# `@assistant-ui/store`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/store)](https://www.npmjs.com/package/@assistant-ui/store)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Tap-based state container with React Context integration. Bridges `@assistant-ui/tap` resources into React via `useAui`, `useAuiState`, and `<AuiProvider>`.

`store` powers the runtime layer of assistant-ui. Most users do not install it directly; reach for `@assistant-ui/react` instead.

## Installation

```bash
npm install @assistant-ui/store @assistant-ui/tap
```

## Usage

```typescript
import { resource, tapState } from "@assistant-ui/tap";
import {
  useAui,
  useAuiState,
  AuiProvider,
  type ClientOutput,
} from "@assistant-ui/store";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    counter: {
      methods: {
        getState: () => { count: number };
        increment: () => void;
      };
    };
  }
}

const CounterClient = resource((): ClientOutput<"counter"> => {
  const [state, setState] = tapState({ count: 0 });
  return {
    getState: () => state,
    increment: () => setState({ count: state.count + 1 }),
  };
});

function App() {
  const aui = useAui({ counter: CounterClient() });
  return (
    <AuiProvider value={aui}>
      <Counter />
    </AuiProvider>
  );
}

function Counter() {
  const count = useAuiState((s) => s.counter.count);
  const aui = useAui();
  return <button onClick={() => aui.counter().increment()}>{count}</button>;
}
```

Full API reference (clients, derived clients, events, `tapClientLookup`, `tapClientList`) at [assistant-ui.com/tap/docs/store/quickstart](https://www.assistant-ui.com/tap/docs/store/quickstart).
