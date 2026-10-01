# with-vscode

A VS Code extension that renders the assistant-ui `Thread` in a webview. It is the test bed for running assistant-ui inside VS Code: scripted fixtures answer without a network or API key, a switchboard of settings selects what the webview mounts, and a Readiness view runs probes against the live webview.

## Run it

1. From the monorepo root, install and build the workspace packages:

   ```bash
   pnpm install
   pnpm turbo build --filter='with-vscode^...'
   ```

2. Open `examples/with-vscode` as the workspace folder in VS Code and press F5. The `dev` task watches `src/`, `webview/` and `test/`, and an Extension Development Host opens with the **Assistant** view in the secondary side bar.

3. Start a message with a fixture name: `text`, `markdown`, `tool`, `approval` or `error`, or a rich fixture such as `reasoning`, `sources`, `files` or `agent`. Any other message lists them.

4. Run **AUI Test Bed: Open Component Gallery** to see the kit components in an editor tab.

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

`pnpm screenshots` runs the probes like `pnpm test`, then saves a screenshot of the window with the Assistant view open under Default Dark Modern and Default Light Modern to `screenshots/` (gitignored), captured over the DevTools Protocol. It then captures the component gallery, described below.

## Component gallery

**AUI Test Bed: Open Component Gallery** (`auiTest.openGallery`) opens an editor tab that renders every gallery section, grouped by category (`chat`, `content`, `agents`), each in a labelled card with the anchor `#section-<id>`. It uses the same `renderWebviewHtml` path, CSP (`auiTest.csp`) and theme as the Assistant view, from its own bundle, `webview/gallery/main.tsx`. The command takes an optional `{ section, width }`: `section` renders one section in isolation and `width` forces each card to that many CSS pixels; both travel in the boot config's `gallery` field. Each section renders inside an error boundary that shows and records what it throws.

### Add a section

1. Create `webview/gallery/sections/<component>.tsx`, one file per component, and default-export its sections:

   ```tsx
   import { MarkdownText } from "@assistant-ui/ui/components/assistant-ui/elements/markdown-text.tsx";
   import { defineSections } from "../types";
   import { SeededMessages } from "../runtime";

   export default defineSections([
     {
       id: "markdown-text", // unique, kebab-case: anchor, selector and screenshot name
       title: "Markdown text",
       category: "content", // "chat" | "content" | "agents"
       notes: "What the section shows, or a known issue.",
       render: () => (
         <SeededMessages
           messages={[{ role: "assistant", content: "## Hello" }]}
           components={{ Text: MarkdownText }}
         />
       ),
     },
   ]);
   ```

2. Import kit components from `@assistant-ui/ui/components/assistant-ui/elements/<file>.tsx` and use them the way their docs page (`apps/docs/content/elements/<name>.mdx`) and demo (`apps/docs/components/demo/elements/`) do.
3. A component built on thread, message, part or thread-list state renders inside a runtime from `webview/gallery/runtime.tsx`, which never calls a backend:
   - `SeededRuntime` provides a local runtime seeded with `messages` (`ThreadMessageLike[]`, default: a short exchange), optional tool UIs (`tools`, a `Toolkit`) and optional `threads` for a thread list.
   - `SeededMessages` renders only the seeded messages with the part `components` you pass.
   - `SeededThread` renders the kit's full `Thread` in a fixed-height box.

The `glob-modules` plugin in `scripts/build.mts` resolves `virtual:gallery-sections` to the default export of every file in the folder (sorted by name; files starting with `_` and `*.test.*` are skipped), so there is no shared index to edit and `pnpm dev` picks up a new file. A duplicate or non-kebab-case id fails the gallery probes.

### Add a rich fixture

A rich fixture streams parts the core fixtures do not: `reasoning`, `source`, `file` (a `data:` URL), `data` (a named data part), and `tool-call` with a `toolName` a tool UI is registered for, with a `result` (answered by the host) and optionally `isError`. `FixtureStep` in `src/fixtures/types.ts` lists every step; both fixture routes play them.

1. Create `src/fixtures/rich/<family>.ts` and default-export `defineFixtures([...])` from `../types`. A fixture's `name` is the first word of its `prompt`, lower case, and must be unique. Keep the tool calls answered (with a `result`) so the run settles.
2. If the family needs a tool UI or a data UI, create `webview/fixture-ui/<family>.tsx` and default-export `defineFixtureUI({ tools, dataUIs })` from `../define-fixture-ui`: `tools` is a `Toolkit` keyed by tool name (`{ type: "backend", render }`; add `display: "standalone"` to keep a card out of the collapsed tool group), `dataUIs` is a list of `{ name, render }`. Export the tool and data names from the fixture file and import them in the UI file.

`virtual:rich-fixtures` and `virtual:fixture-uis` collect both folders the same way. `src/fixtures/rich/agents.ts` with `webview/fixture-ui/agents.tsx` is the worked example. Rich fixtures do not appear in the welcome suggestions; type their prompt, or run `help`.

### Checks

Four probes (phase 1, workstream "Component gallery") cover the gallery. The first three open the gallery and share one sweep per page load: each section is shown alone at a sidebar width of 320px with animations off, then all of them together. Their detail names each failing section.

- `gallery-csp`: no `securitypolicyviolation` event while a section renders.
- `gallery-errors`: no uncaught error, unhandled rejection, `console.error` or error boundary.
- `gallery-overflow`: no section body is wider than its card (`scrollWidth > clientWidth`), except inside a scroll or clip container, and the page does not scroll sideways. The detail names the outermost elements that stick out.
- `chat-fixtures`: in the Assistant view, each rich fixture runs in a new thread under the current runtime; the reply has a part for every step, the thread stays mounted, and no CSP violation or `console.error` occurs.

### Screenshots

After the probes, `pnpm screenshots` lays the window out at 1600x2000 and captures, under Default Dark Modern, Default Light Modern and Default High Contrast:

- each section's card at editor width and at 320px, to `screenshots/gallery/<dark-modern|light-modern|hc-dark>/<editor|narrow>/<section>.png`;
- the Assistant view after each rich fixture, to `screenshots/gallery/<theme>/assistant/<fixture>.png`.

`screenshots/gallery/index.html` is a contact sheet with every capture of a section side by side. A section taller than the view is cut at its bottom edge, and the sheet says so.

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

`scaffold-matches` runs `assistant-ui create --template vscode` from this checkout with `--skip-install` (the CLI is a dev dependency, so build it with the other workspace packages and have `node` on `PATH`) and checks the files the template shares with the test bed by design, in `src/readiness/scaffold.ts`: the chat route body (against the default template's `app/api/chat/route.ts`), the esbuild host and webview options, the `serveWebviewHost` and `renderWebviewHtml` wiring, the theme import order, the zod jitless import, the `useChatRuntime` transport, the `package.json` engine and dependency ranges, the F5 launch and problem matcher, and that the CLI stripped the workspace paths.

`pnpm test` runs every probe headless through `@vscode/test-electron`, once per implemented runtime (or the comma-separated `AUI_TESTBED_RUNTIMES`), and prints a table per runtime. It fails when the webview never boots or when a probe expected green by `AUI_TESTBED_PHASE` (default `0`) is not passing under any runtime. A probe expected green that fails is run once more in the same VS Code session; it counts as passing only if the second run passes, and the `retry` column names every probe that needed one. The run writes the report as JSON to `test-results/probe-report.json`, copies the VS Code logs to `test-results/logs/`, and appends the tables to `$GITHUB_STEP_SUMMARY` when it is set. On Linux, run it under `xvfb-run -a`.

`AUI_TESTBED_VSCODE_VERSION` picks the VS Code build (default `stable`), which `@vscode/test-electron` downloads to `.vscode-test/`.

## CI

Three workflows in `.github/workflows/` run the test bed on `ubuntu-latest` under `xvfb-run`, with VS Code pinned by `AUI_TESTBED_VSCODE_VERSION` and its download cached per OS, architecture and version:

- **VS Code Test Bed** (`vscode-test-bed.yaml`) runs `pnpm test` at `AUI_TESTBED_PHASE=1`, one job per runtime (`ai-sdk`, `local`), and uploads `test-results/` as `vscode-test-bed-probes-<runtime>` (kept 14 days), pass or fail.
- **VS Code Test Bed Screenshots** (`vscode-test-bed-screenshots.yaml`) runs `pnpm screenshots` when a change touches `packages/ui`, `packages/vscode`, `examples/with-vscode` or `templates/vscode`, or on demand, and uploads `screenshots/` as `vscode-test-bed-screenshots` (kept 14 days, 30 on `main`). Download it from the run's summary and open `gallery/index.html`.
- **VS Code Test Bed (combined branches)** (`vscode-test-bed-combined.yaml`) is started by hand: it checks out `base`, applies the commits each branch in `branches` has since `origin/main` (`git cherry-pick --no-commit`), and runs both probe jobs and the screenshots on the combined tree. It fails on the first branch that conflicts and names it. `base` defaults to `main`; pass the branch that carries the test bed when it has not reached `main` yet.

To bump VS Code, set `AUI_TESTBED_VSCODE_VERSION` to the new release in all three workflows, run `AUI_TESTBED_VSCODE_VERSION=<version> AUI_TESTBED_PHASE=1 pnpm test` locally, and fix what it turns up in the same PR. The new version gets a new cache key, so the first run downloads it.

The workflows install `xvfb libgtk-3-0t64 libnss3 libasound2t64 libgbm1`, the libraries VS Code needs that a bare Ubuntu 24.04 image lacks.

