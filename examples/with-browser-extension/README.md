# with-browser-extension

A Chrome extension that hosts an assistant-ui chat interface in a browser side panel.

Uses `useExternalStoreRuntime` with mock messages to demonstrate the UI without a backend. Swap in your own runtime (Cloud, AI SDK, etc.) for real AI responses.

## Getting Started

1. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

2. Build the extension:

   ```bash
   cd examples/with-browser-extension
   pnpm build
   ```

3. Load into Chrome:

   - Open `chrome://extensions`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `dist/` folder

4. Click the extension icon in the toolbar. The side panel opens with the chat UI.

## Development

```bash
pnpm dev
```

This watches for TypeScript and CSS changes. After each rebuild, reload the extension in `chrome://extensions` (click the refresh icon on the extension card).

## Connecting a Real Backend

Replace `useMockStore()` in `sidepanel.tsx` with a real runtime. Since the extension runs client-side, you'll need to point to an external API endpoint rather than a local route handler.
