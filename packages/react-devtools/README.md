# @assistant-ui/react-devtools

React-first development tools for assistant-ui components. This package ships the reusable React helpers, runtime adapters, and UI necessary to embed the DevTools experience in any host application.

## Features

- **Component Library**: React components for debugging assistant-ui experiences
- **Event Logging**: Track and inspect assistant-ui events and state changes
- **Context Viewer**: View Assistant API context and state in real-time
- **Embeddable Host**: Frame bridges that power custom hosts, including the Chrome extension

## Installation

### As React Component Library

```bash
npm install @assistant-ui/react-devtools
```

### As Chrome Extension

See `apps/devtools-extension` for the standalone Chrome extension source and build scripts (`pnpm --filter @assistant-ui/devtools-extension run build`).

## Usage

### React Components

```tsx
import { DevToolsUI, DevToolsModal } from '@assistant-ui/react-devtools';

// Use the full DevTools UI
<DevToolsUI />

// Or use as a modal overlay
<DevToolsModal />
```

### Chrome Extension

The Chrome extension now lives under `apps/devtools-extension` as a separate workspace app. It consumes this package at build time to reuse the shared runtime and UI.

## Build Scripts

- `npm run build` - Build the React component library
- `npm run build:lib` - Alias for `build`
- `npm run dev` - Development build with watch mode

## Package Structure

```
packages/react-devtools/
├── src/                     # React component library source
│   ├── DevToolsHooks.ts     # Core devtools functionality
│   ├── DevToolsModal.tsx    # Modal wrapper component (iframe host)
│   └── index.ts             # Main exports
└── scripts/                 # Build scripts
```

## Development

The devtools package builds with `@assistant-ui/x-buildutils` to transpile the TypeScript sources that power the React helpers and adapters consumed across the workspace.

## License

MIT
