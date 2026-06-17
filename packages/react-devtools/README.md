# `@assistant-ui/react-devtools`

React DevTools UI for `@assistant-ui/react`. Embed an event log, context viewer, and runtime inspector in any host application.

## Installation

```bash
npm install @assistant-ui/react-devtools
```

## Usage

Drop `DevToolsModal` inside your `AssistantRuntimeProvider`. It renders a floating launcher and an inline panel (isolated in a shadow root), and is a no-op in production builds.

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { DevToolsModal } from "@assistant-ui/react-devtools";

export function App() {
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DevToolsModal />
      {/* ...your assistant-ui... */}
    </AssistantRuntimeProvider>
  );
}
```

## Custom tabs

The panel is extensible through a plugin registry. Each plugin receives the inspected instance's projected data and renders a tab body.

```tsx
import { createDevToolsPlugin, DevToolsModal } from "@assistant-ui/react-devtools";

const myTab = createDevToolsPlugin({
  id: "my-tab",
  label: "My tab",
  Component: ({ data }) => <pre>{JSON.stringify(data.state, null, 2)}</pre>,
});

<DevToolsModal plugins={[myTab]} />;
```

## Documentation

Full reference at [assistant-ui.com/docs/devtools](https://www.assistant-ui.com/docs/devtools).
