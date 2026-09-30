# with-vscode

A VS Code extension that renders the assistant-ui `Thread` in a webview. It is the test bed for running assistant-ui inside VS Code: scripted fixtures answer without a network or API key, a switchboard of settings selects what the webview mounts, and a Readiness view runs probes against the live webview.

## Run it

1. From the monorepo root, install and build the workspace packages:

   ```bash
   pnpm install
   pnpm turbo build --filter='with-vscode^...'
   ```

2. Open `examples/with-vscode` as the workspace folder in VS Code and press F5. The `dev` task watches `src/`, `webview/` and `test/`, and an Extension Development Host opens with the **Assistant** view in the secondary side bar.

3. Start a message with a fixture name: `text`, `markdown`, `tool`, `approval` or `error`. Any other message lists them.

## Fetch bridge

The webview reaches the extension host through `@assistant-ui/vscode`: `vscodeFetch` tunnels each request over `postMessage`, and `serveWebviewHost` in `src/webviews.ts` answers it with the routes in `src/routes.ts`. The fixtures play in the extension host, not in the webview.

| Route | Handler | Used by |
| --- | --- | --- |
| `POST /api/chat` | `src/fixtures/route.ts`, an AI SDK UI message stream | `auiTest.runtime=ai-sdk`: `useChatRuntime` with `AssistantChatTransport({ fetch: vscodeFetch })` |
| `POST /api/model` | `src/fixtures/model-route.ts`, an assistant-stream data stream | `auiTest.runtime=local`: `useLocalRuntime(createVSCodeModelAdapter())` |
| `GET /testbed/served-requests` | the request log in `src/routes.ts` | probes that check what the host served and whether `req.signal` fired |
| `GET`, `PUT /testbed/color-theme` | `src/routes.ts`, reads and sets the user `workbench.colorTheme` | `theme-follows` |
| `GET`, `PUT /testbed/open-external` | `src/open-external.ts`, the host's `openExternal` log and its stub switch | `external-link` |

## Links and threads

`serveWebviewHost` also serves the webview's host calls. `installLinkInterceptor()` in `webview/main.tsx` sends link clicks to its `openExternal`, which records each URL in `src/open-external.ts` and opens it with `vscode.env.openExternal`. While stubbed, it records the URL and does not open it. `pnpm test` sets `AUI_TESTBED_STUB_OPEN_EXTERNAL=1`, and `external-link` turns the stub on for its own run.

Both runtimes run inside `useRemoteThreadListRuntime` with `createLocalStorageAdapter({ storage: createVSCodeStorage() })`, which stores threads in the extension's `globalState` under a prefix per runtime. The thread list sits above the thread. `useChatRuntime` needs a history adapter with `withFormat`, which `createLocalStorageAdapter` does not provide, so under `ai-sdk` only the thread list persists and `threads-persist` fails.

`threads-persist` seeds a thread, runs **Reload Assistant Webview**, then switches `auiTest.location` so that a new webview is created, and checks each time that the thread is listed with its messages. Reload Window would end the test run, so these two steps stand in for it.

## HTML, CSP and theme

`src/webviews.ts` renders the webview with `renderWebviewHtml` from `@assistant-ui/vscode/host`: `auiTest.csp` picks the strict or relaxed policy, and `auiTest.location` sets the theme surface (`sidebar`, `panel` or `editor`). The boot config travels in the `data-aui-testbed-boot` attribute of `<body>`, so the page needs no inline script.

`webview/app.css` imports `@assistant-ui/vscode/theme.css` after Tailwind, so the default shadcn components take the VS Code colour theme (`auiTest.style=shadcn`). `theme-follows` checks the mapped tokens against the `--vscode-*` variables, switches between Default Dark Modern and Default Light Modern, checks that the tokens and `dark:` utilities follow, and restores the theme.

`pnpm screenshots` runs the probes like `pnpm test`, then saves a screenshot of the window with the Assistant view open under Default Dark Modern and Default Light Modern to `screenshots/` (gitignored), captured over the DevTools Protocol.

## Switchboard

| Setting | Values |
| --- | --- |
| `auiTest.runtime` | `ai-sdk`, `data-stream`, `assistant-transport`, `local` |
| `auiTest.backend` | `fixture`, `anthropic`, `vscode-lm` |
| `auiTest.style` | `shadcn`, `vscode` |
| `auiTest.csp` | `strict`, `relaxed` |
| `auiTest.location` | `sidebar`, `panel`, `editor` |

Changing a setting re-creates the webview. The Readiness view marks every value that is not implemented yet, and the webview shows the same notice instead of falling back. `ai-sdk` and `local` are implemented; `data-stream` and `assistant-transport` are not.

## Probes

The Readiness view lists every probe with its state: pass, fail or not implemented. **Run All Probes** runs them against the open webview.

- Probe metadata lives in `src/readiness/probes.ts`.
- A probe that runs in the extension host goes in `HOST_PROBES` in `src/readiness/host-probes.ts`.
- A probe that runs in the webview goes in `WEBVIEW_PROBES` in `webview/probes.ts`.

`bridge-roundtrip`, `abort` and `frontend-tool-hitl` run under the current `auiTest.runtime` and read the host's request log, so they pass only when the reply came over the bridge. `every-runtime` switches `auiTest.runtime` through every value, runs `bridge-roundtrip` under each implemented one and restores the setting; it stays not implemented until every runtime is.

`pnpm test` runs every probe headless through `@vscode/test-electron`, once per implemented runtime (or the comma-separated `AUI_TESTBED_RUNTIMES`), and prints a table per runtime. It fails when the webview never boots or when a probe expected green by `AUI_TESTBED_PHASE` (default `0`) is not passing under any runtime. On Linux, run it under `xvfb-run -a`.
