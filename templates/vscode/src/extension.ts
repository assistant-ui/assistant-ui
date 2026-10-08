import { renderWebviewHtml, serveWebviewHost } from "@assistant-ui/vscode/host";
import * as vscode from "vscode";
import { POST } from "./api/chat/route";
import { setOpenAIApiKey } from "./openai";

const API_KEY_SECRET = "openaiApiKey";

export async function activate(context: vscode.ExtensionContext) {
  const loadApiKey = async () => {
    const apiKey = await context.secrets.get(API_KEY_SECRET);
    setOpenAIApiKey(apiKey);
    return apiKey ?? process.env.OPENAI_API_KEY;
  };
  const setApiKey = async () => {
    const apiKey = await vscode.window.showInputBox({
      title: "OpenAI API Key",
      prompt: "Stored in VS Code's secret storage.",
      placeHolder: "sk-...",
      password: true,
      ignoreFocusOut: true,
    });
    if (apiKey === undefined) return;
    if (apiKey) await context.secrets.store(API_KEY_SECRET, apiKey);
    else await context.secrets.delete(API_KEY_SECRET);
  };
  let hasApiKey = Boolean(await loadApiKey());

  const webviewDir = vscode.Uri.joinPath(
    context.extensionUri,
    "dist",
    "webview",
  );

  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(view) {
      view.webview.options = {
        enableScripts: true,
        localResourceRoots: [webviewDir],
      };
      const host = serveWebviewHost(view.webview, {
        routes: { "/api/chat": { POST } },
        // VS Code opens a string as is but re-encodes a Uri, which corrupts escaped characters.
        openExternal: (url) =>
          vscode.env.openExternal(url as unknown as vscode.Uri),
      });
      view.onDidDispose(() => host.dispose());
      view.webview.html = renderWebviewHtml(view.webview, {
        scripts: [vscode.Uri.joinPath(webviewDir, "main.js")],
        styles: [
          vscode.Uri.joinPath(webviewDir, "app.css"),
          vscode.Uri.joinPath(webviewDir, "main.css"),
        ],
        title: "Assistant",
        surface: "sidebar",
        scriptType: "classic",
      });

      if (!hasApiKey) {
        void vscode.window
          .showWarningMessage(
            "Set an OpenAI API key to chat with the assistant.",
            "Set API Key",
          )
          .then((choice) => (choice ? setApiKey() : undefined));
      }
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("auiAssistant.chat", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("auiAssistant.setApiKey", setApiKey),
    context.secrets.onDidChange(async (event) => {
      if (event.key === API_KEY_SECRET) hasApiKey = Boolean(await loadApiKey());
    }),
  );
}

export function deactivate() {}
