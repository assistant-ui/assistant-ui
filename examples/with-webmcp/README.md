# WebMCP Example

This example exposes an assistant-ui app's frontend tools to browser agents over [WebMCP](https://developer.chrome.com/docs/ai/webmcp), via `@assistant-ui/react-webmcp`.

The app is a small task board. Four frontend tools (`list_tasks`, `add_task`, `set_task_done`, `remove_task`) are registered through the standard assistant-ui tool registry, so two kinds of agents can drive the same board:

- the in-app chat (AI SDK runtime, `/api/chat`), which calls the tools as regular frontend tools;
- any WebMCP-capable agent outside the page (ChatGPT desktop's built-in browser, Chrome's Model Context Tool Inspector), via `useWebMcpBridge()`, which mirrors the registry onto `document.modelContext` / `navigator.modelContext`.

Every WebMCP-initiated call goes through an in-app approval dialog (`useWebMcpApprovals()`) with Allow once / Always allow / Deny. "Always allow" is remembered against the tool's name together with its description and schema: an ordinary re-render that re-registers the same tool keeps the grant, while re-registering that name with a different description or schema — a different tool under a recycled name — drops it, as does unmounting the bridge, so the next call prompts again. A deny returns an MCP error result with the optional reason you type.

Exposing a tool over WebMCP does not widen what an agent can reach. The bridge only registers frontend tools the page has already loaded, so it exposes what the page's own JavaScript could call anyway. Server-side authorization is enforced per endpoint by the API each tool calls, never by the contents of the tool list.

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
2. **Execute round trip**: run `add_task` from the inspector; the approval dialog opens with the tool name and arguments; Allow once executes the tool, the task appears on the board, and the inspector receives the result content. Deny returns an error result (with the typed reason) and the board is unchanged. Always allow skips the dialog for subsequent calls to the same tool until its description or schema changes, or the bridge unmounts — a client-side navigation away from the page as well as a full reload.
3. **Removal round trip**: run `remove_task` from the inspector with the id of an existing task; after approval the task disappears from the board and the result confirms the removal. Run it again with the same id and confirm the result reports the task as missing without an exception.
4. **Name collision**: before the bridge mounts (e.g. from a script in `app/layout.tsx` or the console on a page reload), call `document.modelContext.registerTool({ name: "add_task", ... })` yourself; the bridge should register the other three tools and leave your registration in place — including after navigating away. On a browser with a synchronous `getTools()` you get the skip warning for `add_task`; on one with the spec's asynchronous `getTools()` the browser rejects the duplicate instead and you get the registration-failed warning.
5. **toolchange**: navigating away from the page (or unmounting the provider) unregisters the tools; the inspector reflects the change without a reload.
6. **End to end**: ChatGPT desktop (GPT-5.6 Sol or Terra) drives the board through conversation, with approvals resolving visibly in the app.

## Notes

- The bridge owns the tools it registers: it only ever unregisters names it registered, and a registration the browser rejects unregisters nothing. The authoritative arbiter of a name collision is the browser rejecting the duplicate — the bridge warns and leaves the name alone. The pre-registration collision check reads a *synchronous* `getTools()`; the spec's `getTools()` is asynchronous and the bridge deliberately does not await it before calling `registerTool`, since an enumeration read is a hint the registration can invalidate anyway, so on those browsers the check never fires and the rejection is the only signal. The synchronous check stays as protection for older or permissive implementations; one that silently accepts duplicates can still end up with the last registration winning.
- A skipped collision is not retried on its own. The bridge tries the name again on the next assistant-ui registry or filter sync — any model-context notification, or a new `filter` identity passed to `useWebMcpBridge()`, not only a change to the tool set — so a tool skipped because the page already owned the name stays unexposed until then, even if the other registration is removed in between.
- Inline options are fine: passing a fresh `filter` function or options object to `useWebMcpBridge()` on every render does not tear down and re-register the tools.
- Tools are exposed when they are `type: "frontend"` with a local `execute` and not disabled; human tools and backend tools are never exposed.
- Approvals time out after 2 minutes ("expired") and are cancelled if the calling agent aborts. Once a call is past its approval, the merged abort signal is handed to the tool's `execute`, so cancellation from that point on is up to the tool.
- Changing a tool's description or schema re-registers it, which cancels any call of that tool still waiting on approval (the agent gets a "cancelled" result and the dialog closes). Keep the descriptions the bridge exposes static — a description interpolating live data, like `` `List the ${tasks.length} tasks` ``, cancels its own approval whenever that data changes.
