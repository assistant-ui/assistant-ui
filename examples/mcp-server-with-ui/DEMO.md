# AUI Protocol Demo

This demo shows all the new AUI protocol features implemented for ChatGPT Apps SDK parity.

## Features Demonstrated

1. **Theme Awareness** - Widget adapts to light/dark mode
2. **Widget State Persistence** - Counter persists across re-renders
3. **Display Mode Changes** - Request fullscreen/pip modes
4. **Follow-up Messages** - Send messages back to the assistant
5. **Height Notification** - Dynamic iframe height

## Quick Start

Just run one command from the `mcp-ui-client-demo` directory:

```bash
cd examples/mcp-ui-client-demo
pnpm dev
```

This will:
1. Build `@assistant-ui/tool-ui-server` package
2. Build the MCP server and UI bundle
3. Start the UI server on port 3001
4. Start the Next.js app on port 3005

## Test the Demo

1. Open http://localhost:3005
2. Ask: **"Show me the AUI demo"** or **"Run the aui_demo tool"**
3. Try the buttons:
   - **Increment Counter** - Tests widget state persistence
   - **Go Fullscreen** - Tests display mode request
   - **Send Follow-up** - Tests follow-up message sending

## What to Observe

- The widget shows current theme, display mode, and locale
- Clicking "Increment Counter" updates the counter and persists state
- Status messages appear when actions are triggered
- Theme changes from the parent app should reflect in the widget
