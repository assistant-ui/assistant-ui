This is the [assistant-ui](https://github.com/assistant-ui/assistant-ui) starter for a VS Code extension. It shows the assistant-ui `Thread` in a webview in the secondary side bar and answers it from an AI SDK route handler that runs in the extension host.

## Getting Started

Install the dependencies:

```bash
npm install
```

Open this folder in VS Code and press F5. The `dev` task builds the extension in watch mode, and an Extension Development Host window opens with the **Assistant** view in the secondary side bar.

The first time the view opens, it asks for your OpenAI API key and stores it in VS Code's secret storage. Run **Assistant: Set OpenAI API Key** from the Command Palette to change it. Without a stored key, the extension reads `OPENAI_API_KEY` from its environment.

## How it works

- `src/extension.ts` registers the webview view. `serveWebviewHost` from `@assistant-ui/vscode/host` answers the webview's requests, and `renderWebviewHtml` writes its HTML and Content Security Policy.
- `src/api/chat/route.ts` is the chat route handler. It is the same `POST(req: Request)` handler as the Next.js starter's `app/api/chat/route.ts`, and it runs unchanged in the extension host, so the API key never reaches the webview.
- `src/webview/assistant.tsx` mounts `useChatRuntime` with `vscodeFetch`, which tunnels `fetch("/api/chat")` over the webview's message channel to the extension host.
- `src/webview/app.css` imports `@assistant-ui/vscode/theme.css`, which maps the component colours to the active VS Code colour theme.

## Scripts

- `npm run dev` builds `dist/` in watch mode.
- `npm run build` builds `dist/` once.
- `npm run typecheck` checks types.
- `npm run package` builds a `.vsix` with [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce). Set your `publisher` in `package.json` first.

See the [VS Code guide](https://www.assistant-ui.com/docs/guides/vscode) for more.
