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

## Switchboard

| Setting | Values |
| --- | --- |
| `auiTest.runtime` | `ai-sdk`, `data-stream`, `assistant-transport`, `local` |
| `auiTest.backend` | `fixture`, `anthropic`, `vscode-lm` |
| `auiTest.style` | `shadcn`, `vscode` |
| `auiTest.csp` | `strict`, `relaxed` |
| `auiTest.location` | `sidebar`, `panel`, `editor` |

Changing a setting re-creates the webview. The Readiness view marks every value that is not implemented yet, and the webview shows the same notice instead of falling back.

## Probes

The Readiness view lists every probe with its state: pass, fail or not implemented. **Run All Probes** runs them against the open webview.

- Probe metadata lives in `src/readiness/probes.ts`.
- A probe that runs in the extension host goes in `HOST_PROBES` in `src/readiness/host-probes.ts`.
- A probe that runs in the webview goes in `WEBVIEW_PROBES` in `webview/probes.ts`.

`pnpm test` runs every probe headless through `@vscode/test-electron` and prints a table. It fails when the webview never boots or when a probe expected green by `AUI_TESTBED_PHASE` (default `0`) is not passing. On Linux, run it under `xvfb-run -a`.
