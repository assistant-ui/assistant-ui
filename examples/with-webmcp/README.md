# with-webmcp

Exposes an app's frontend tools to a WebMCP-capable browser with `unstable_useWebMcpProvider`, while the same tools stay callable from the assistant-ui chat thread.

The page holds a small task list and a `"use generative"` toolkit with three frontend tools:

- `add_task` — mutates the page's task list.
- `list_tasks` — reads the page's task list.
- `clear_completed_tasks` — destructive, gated on user approval via `human()`.

`unstable_useWebMcpProvider` publishes the first two to the browser's `document.modelContext`, so the user's browser agent can call them directly. `clear_completed_tasks` is kept chat-only by composing `unstable_defaultWebMcpFilter` with an allowlist: a published tool is callable by anyone driving the browser, with the assistant's approval step out of the loop, and this one deletes data. The allowlist is what makes chat-only the default, so the next tool added to the toolkit is not published until someone names it here. Its `human()` prompt is chat-only as well, though that needs no filter of its own; a WebMCP call rejects it with "human input not supported in WebMCP context" rather than hanging.

## Run

Create `.env.local`:

```sh
OPENAI_API_KEY=your-api-key-here
```

Then:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The chat works in any browser. The status line under the task list shows "WebMCP not detected" unless the browser (or an extension) provides `document.modelContext`; with WebMCP available it lists the published tool names, and a browser agent can add or list tasks without going through the chat thread.

## Related Documentation

- [WebMCP provider](https://www.assistant-ui.com/docs/tools/webmcp)
- [Defining Tools](https://www.assistant-ui.com/docs/tools/defining-tools)
