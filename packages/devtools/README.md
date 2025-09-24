# @assistant-ui/devtools

Development tools for assistant-ui React components, available as both a React component library and Chrome extension.

## Features

- **Component Library**: React components for debugging assistant-ui
- **Chrome Extension**: Browser devtools panel for inspecting assistant-ui components
- **Event Logging**: Track and inspect assistant-ui events and state changes
- **Context Viewer**: View Assistant API context and state in real-time

## Installation

### As React Component Library

```bash
npm install @assistant-ui/devtools
```

### As Chrome Extension

1. Build the extension: `npm run build:extension`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension/dist` folder

## Usage

### React Components

```tsx
import { DevToolsUI, DevToolsModal } from '@assistant-ui/devtools';

// Use the full DevTools UI
<DevToolsUI />

// Or use as a modal overlay
<DevToolsModal />
```

### Chrome Extension

The extension automatically detects pages using assistant-ui components and adds a "assistant-ui" tab to the Chrome DevTools panel.

## Build Scripts

- `npm run build` - Build both library and extension
- `npm run build:lib` - Build only the React component library
- `npm run build:extension` - Build only the Chrome extension
- `npm run dev` - Development build with watch mode
- `npm run dev:extension` - Development build for extension with watch mode

## Package Structure

```
packages/devtools/
├── src/                     # React component library source
│   ├── DevToolsHooks.ts     # Core devtools functionality
│   ├── DevToolsModal.tsx    # Modal wrapper component (iframe host)
│   └── index.ts             # Main exports
├── extension/               # Chrome extension source
│   ├── manifest.json        # Extension manifest
│   ├── content.ts           # Content script
│   ├── devtools.ts          # DevTools integration
│   ├── devtools-panel.tsx   # DevTools panel host (iframe + bridge)
│   └── static/              # Static files (HTML, icons)
└── scripts/                 # Build scripts
```

## Development

The devtools package uses a dual build system:

1. **Library Build**: Uses the standard assistant-ui build system via `@assistant-ui/x-buildutils`
2. **Extension Build**: Uses esbuild to bundle extension files for Chrome

## License

MIT
