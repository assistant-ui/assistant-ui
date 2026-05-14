# `@assistant-ui/react-devtools`

React DevTools UI for `@assistant-ui/react`. Embed an event log, context viewer, and runtime inspector in any host application.

## Installation

```bash
npm install @assistant-ui/react-devtools
```

## Usage

```tsx
import { DevToolsModal, DevToolsFrame } from "@assistant-ui/react-devtools";

// render as a modal overlay
<DevToolsModal />;

// or embed inline as a frame
<DevToolsFrame />;
```

## Chrome extension

A standalone Chrome extension consuming this package lives at [`apps/devtools-extension`](https://github.com/assistant-ui/assistant-ui/tree/main/apps/devtools-extension).

## Documentation

Full reference at [assistant-ui.com/docs/devtools](https://www.assistant-ui.com/docs/devtools).
