import { randomBytes } from "node:crypto";
import { serveWebviewRoutes } from "@assistant-ui/vscode/host";
import * as vscode from "vscode";
import {
  isTestbedMessage,
  TESTBED_CHANNEL,
  type HostToWebviewMessage,
  type WebviewBootConfig,
  type WebviewToHostMessage,
} from "./protocol";
import type { ProbeId, ProbeResult } from "./readiness/probes";
import { createWebviewRoutes } from "./routes";
import {
  SWITCHBOARD_KEYS,
  unimplementedSettings,
  type Switchboard,
} from "./switchboard";

export const readSwitchboard = (): Switchboard => {
  const config = vscode.workspace.getConfiguration("auiTest");
  return Object.fromEntries(
    SWITCHBOARD_KEYS.map((key) => [key, config.get<string>(key)]),
  ) as Switchboard;
};

const sameSwitchboard = (a: Switchboard, b: Switchboard) =>
  SWITCHBOARD_KEYS.every((key) => a[key] === b[key]);

const renderHtml = (
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  switchboard: Switchboard,
) => {
  const nonce = randomBytes(16).toString("base64");
  const asset = (file: string) =>
    webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist", "webview", file),
    );
  // A nonce in style-src makes browsers ignore 'unsafe-inline', so relaxed mode drops it.
  const styleSrc =
    switchboard.csp === "strict"
      ? `${webview.cspSource} 'nonce-${nonce}'`
      : `${webview.cspSource} 'unsafe-inline'`;
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src ${styleSrc}`,
    `img-src ${webview.cspSource} blob: data: https:`,
    `font-src ${webview.cspSource}`,
  ].join("; ");
  const boot: WebviewBootConfig = {
    switchboard,
    unimplemented: unimplementedSettings(switchboard),
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${asset("app.css")}" />
    <link rel="stylesheet" href="${asset("main.css")}" />
    <title>Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" id="aui-testbed-boot" type="application/json">${JSON.stringify(boot).replace(/</g, "\\u003c")}</script>
    <script nonce="${nonce}" src="${asset("main.js")}"></script>
  </body>
</html>`;
};

type AttachedWebview = {
  webview: vscode.Webview;
  switchboard: Switchboard;
  ready: boolean;
  implementedProbes: ReadonlySet<ProbeId>;
};

export class AssistantWebviews implements vscode.Disposable {
  private readonly attached = new Set<AttachedWebview>();
  private readonly pending = new Map<string, (result: ProbeResult) => void>();
  private readonly readyEmitter = new vscode.EventEmitter<void>();
  private readonly routes = createWebviewRoutes();
  private nextRequestId = 0;

  constructor(private readonly extensionUri: vscode.Uri) {}

  attach(webview: vscode.Webview): vscode.Disposable & { hidden(): void } {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
      ],
    };
    const entry: AttachedWebview = {
      webview,
      switchboard: readSwitchboard(),
      ready: false,
      implementedProbes: new Set(),
    };
    this.attached.add(entry);
    const subscription = webview.onDidReceiveMessage((message: unknown) =>
      this.onMessage(entry, message),
    );
    const server = serveWebviewRoutes(webview, this.routes);
    this.render(entry);
    return {
      hidden: () => {
        entry.ready = false;
      },
      dispose: () => {
        subscription.dispose();
        server.dispose();
        this.attached.delete(entry);
      },
    };
  }

  reloadAll() {
    for (const entry of this.attached) this.render(entry);
  }

  /** Resolves with a webview that booted with the current switchboard. */
  async waitForReady(timeoutMs: number) {
    const find = () => {
      const switchboard = readSwitchboard();
      return [...this.attached].findLast(
        (e) => e.ready && sameSwitchboard(e.switchboard, switchboard),
      );
    };
    const existing = find();
    if (existing) return existing;
    return new Promise<AttachedWebview | undefined>((resolve) => {
      const timer = setTimeout(() => {
        subscription.dispose();
        resolve(undefined);
      }, timeoutMs);
      const subscription = this.readyEmitter.event(() => {
        const entry = find();
        if (!entry) return;
        clearTimeout(timer);
        subscription.dispose();
        resolve(entry);
      });
    });
  }

  runProbe(entry: AttachedWebview, probeId: ProbeId, timeoutMs: number) {
    const requestId = String(this.nextRequestId++);
    return new Promise<ProbeResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve({ state: "fail", detail: `Timed out after ${timeoutMs} ms` });
      }, timeoutMs);
      this.pending.set(requestId, (result) => {
        clearTimeout(timer);
        this.pending.delete(requestId);
        resolve(result);
      });
      const message: HostToWebviewMessage = {
        channel: TESTBED_CHANNEL,
        type: "run-probe",
        requestId,
        probeId,
      };
      void entry.webview.postMessage(message);
    });
  }

  dispose() {
    this.readyEmitter.dispose();
    this.attached.clear();
  }

  private render(entry: AttachedWebview) {
    entry.ready = false;
    entry.switchboard = readSwitchboard();
    entry.webview.html = renderHtml(
      entry.webview,
      this.extensionUri,
      entry.switchboard,
    );
  }

  private onMessage(entry: AttachedWebview, data: unknown) {
    if (!isTestbedMessage(data)) return;
    const message = data as WebviewToHostMessage;
    if (message.type === "ready") {
      entry.ready = true;
      entry.implementedProbes = new Set(message.implementedProbes);
      this.readyEmitter.fire();
    } else if (message.type === "probe-result") {
      this.pending.get(message.requestId)?.(message.result);
    }
  }
}
