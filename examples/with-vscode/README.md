# VS Code test bed

This private VS Code extension tests `@assistant-ui/vscode` with a chat webview, scripted fixtures, and readiness probes. Fixtures run in the extension host without a network connection or API key.

## Run it

1. From the monorepo root, install and build the workspace dependencies with `pnpm install` and `pnpm turbo build --filter='with-vscode^...'`.
2. Open `examples/with-vscode` as the workspace folder in VS Code and press F5. The `dev` task watches the extension host, webview, and test files. The Extension Development Host opens the Assistant view in the secondary side bar.
3. Start a message with a fixture name such as `text`, `markdown`, `tool`, `approval`, `error`, `reasoning`, `sources`, `files`, or `agent`. Any other message lists the available fixtures.

## Fetch bridge and storage

The webview uses `vscodeFetch` from `@assistant-ui/vscode` to tunnel requests over `postMessage`. `serveWebviewHost` in `src/webviews.ts` answers them through `src/routes.ts`. `POST /api/chat` streams scripted AI SDK UI messages, `GET /testbed/served-requests` reports requests for bridge and abort probes, `GET` and `PUT /testbed/color-theme` support the theme probe, and `GET` and `PUT /testbed/open-external` support the external link probe.

`installLinkInterceptor()` in `webview/main.tsx` routes link clicks through the host's `openExternal` handler. The handler records the URL before opening it with `vscode.env.openExternal`; the probe stubs the open and verifies the URL. The test runner sets `AUI_TESTBED_STUB_OPEN_EXTERNAL=1`.

`useRemoteThreadListRuntime` uses `createLocalStorageAdapter({ storage: createVSCodeStorage() })` to store threads and messages in the extension's `globalState`. `threads-persist` checks the thread and its messages after reloading the Assistant webview and switching its location to create a new webview.

## HTML and theme

`src/webviews.ts` calls `renderWebviewHtml` with the selected CSP policy and surface (`sidebar`, `panel`, or `editor`). The boot configuration travels in a body attribute. The CSP allows favicons from `https://icons.duckduckgo.com` for the Sources component.

`webview/app.css` imports `@assistant-ui/vscode/theme.css` after Tailwind so the kit components follow VS Code colors. `theme-follows` checks the mapped tokens and dark utilities before and after a theme switch, then restores the original theme.

## Rich fixtures

`src/fixtures/rich/` contains scripted fixture families. To add one, default-export `defineFixtures([...])` from a new file and give each fixture a unique lower case first word in its prompt. Keep tool calls answered so runs settle. If a fixture needs a tool UI or data UI, default-export `defineFixtureUI({ tools, dataUIs })` from a matching file in `webview/fixture-ui/`. The `virtual:rich-fixtures` and `virtual:fixture-uis` modules collect these folders during the build. `chat-fixtures` runs each rich fixture in a new thread and checks its parts, errors, and CSP violations.

## Switchboard and probes

| Setting | Values |
| --- | --- |
| `auiTest.csp` | `strict`, `relaxed` |
| `auiTest.location` | `sidebar`, `panel`, `editor` |

Changing a setting re-creates the webview. The Readiness view runs `bridge-roundtrip`, `abort`, `frontend-tool-hitl`, `csp-zero`, `theme-follows`, `external-link`, `threads-persist`, and `chat-fixtures`. Probe definitions live in `src/readiness/probes.ts`, host probes in `src/readiness/host-probes.ts`, and webview probes in `webview/probes.ts`.

`pnpm probes` builds the extension and runs probes headless through `@vscode/test-electron`. Every probe must pass; a failed probe is retried once in the same VS Code session. Results go to `test-results/probe-report.json`, VS Code logs to `test-results/logs/`, and tables to `$GITHUB_STEP_SUMMARY` when set. On Linux, run under `xvfb-run -a`.

`AUI_TESTBED_VSCODE_VERSION` selects the VS Code build. The local default is `stable`; CI pins its version in `.github/workflows/vscode-test-bed.yaml` and caches that download. To bump the CI version, update that workflow and run `AUI_TESTBED_VSCODE_VERSION=<version> pnpm probes` locally.

The workflow runs the probes on `ubuntu-latest` under `xvfb-run` and uploads `test-results/` whether the run passes or fails. It installs `xvfb libgtk-3-0t64 libnss3 libasound2t64 libgbm1` for the VS Code host.
