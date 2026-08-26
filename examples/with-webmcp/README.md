# WebMCP Example

This example exposes an assistant-ui app's frontend tools to browser agents over [WebMCP](https://developer.chrome.com/docs/ai/webmcp), via `@assistant-ui/react-webmcp`.

The app is a small task board. Four frontend tools (`list_tasks`, `add_task`, `set_task_done`, `remove_task`) are registered through the standard assistant-ui tool registry, so two kinds of agents can drive the same board:

- the in-app chat (AI SDK runtime, `/api/chat`), which calls the tools as regular frontend tools;
- any WebMCP-capable agent outside the page (ChatGPT desktop's built-in browser, Chrome's Model Context Tool Inspector), via `<WebMcpBridge />`, which mirrors the registry onto `document.modelContext` / `navigator.modelContext`.

Every WebMCP-initiated call goes through an in-app approval dialog (`useWebMcpApprovals()`) with Allow once / Always allow / Deny. "Always allow" is remembered for the browser session only; a deny returns an MCP error result with the optional reason you type.

## Run

```sh
# in the repo root
pnpm install

# in examples/with-webmcp
cp .env.example .env.local   # set OPENAI_API_KEY
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The chat works in any browser; the WebMCP bridge additionally needs a browser that ships the API (see below). The header shows whether WebMCP was detected.

## Enabling WebMCP

### Route 1: Chrome flag (Chrome 146+)

1. Open `chrome://flags/#enable-webmcp-testing`, set it to Enabled, relaunch.
2. Reload the app — the header badge should switch to "WebMCP available".

### Route 2: Origin trial (Chrome 149–156)

For a deployment without the flag, register your origin for the WebMCP origin trial and place the token in the commented `<meta httpEquiv="origin-trial" …>` slot in `app/layout.tsx`. The trial runs from Chrome 149 through Chrome 156.

## Driving the tools from outside the page

- **Model Context Tool Inspector** (Chrome extension by Google Chrome Labs): open the inspector on the page; the four tools should be listed with their schemas, and executing one triggers the approval dialog in the app.
- **ChatGPT desktop**: open the app's URL in the ChatGPT desktop app's built-in browser and ask it to manage the board (e.g. "add a task to review the launch checklist"). WebMCP consumption requires GPT-5.6 Sol or Terra (not Luna) and the latest desktop app; it is unavailable in Enterprise/Edu workspaces.

## Manual browser checklist

Since WebMCP has no CI-friendly browser environment yet, verify manually in a flag-enabled Chrome:

1. **Registration**: with the app open, the Tool Inspector lists `list_tasks`, `add_task`, `set_task_done`, `remove_task` with descriptions and JSON schemas.
2. **Execute round trip**: run `add_task` from the inspector; the approval dialog opens with the tool name and arguments; Allow once executes the tool, the task appears on the board, and the inspector receives the result content. Deny returns an error result (with the typed reason) and the board is unchanged. Always allow skips the dialog for subsequent calls to the same tool this session.
3. **Removal round trip**: run `remove_task` from the inspector with the id of an existing task; after approval the task disappears from the board and the result confirms the removal. Run it again with the same id and confirm the result reports the task as missing without an exception.
4. **Name collision**: before the bridge mounts (e.g. from a script in `app/layout.tsx` or the console on a page reload), call `document.modelContext.registerTool({ name: "add_task", ... })` yourself; the bridge should log a skip warning for `add_task`, register the other three tools, and leave your registration in place — including after navigating away.
5. **toolchange**: navigating away from the page (or unmounting the provider) unregisters the tools; the inspector reflects the change without a reload.
6. **End to end**: ChatGPT desktop (GPT-5.6 Sol or Terra) drives the board through conversation, with approvals resolving visibly in the app.

## Notes

- The bridge owns the tools it registers: it only ever unregisters names it registered. When the browser's model context exposes tool enumeration (`getTools()`), the bridge checks for an existing registration first and warns and skips on a collision; without enumeration it relies on `registerTool` throwing or rejecting for duplicates, so an implementation that silently accepts duplicates can still end up with the last registration winning.
- Inline options are fine: passing a fresh `filter`/`approval` function or options object to `<WebMcpBridge />` on every render does not tear down and re-register the tools.
- Tools are exposed when they are `type: "frontend"` with a local `execute` and not disabled; human tools and backend tools are never exposed.
- Approvals time out after 2 minutes ("expired") and are cancelled if the calling agent aborts.
