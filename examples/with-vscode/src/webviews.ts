import { renderWebviewHtml, serveWebviewHost } from "@assistant-ui/vscode/host";
import * as vscode from "vscode";
import {
  BOOT_ATTRIBUTE,
  isTestbedMessage,
  TESTBED_CHANNEL,
  type HostToWebviewMessage,
  type TaskResult,
  type WebviewBootConfig,
  type WebviewTaskId,
  type WebviewToHostMessage,
} from "./protocol";
import type { ProbeId, ProbeResult } from "./readiness/probes";
import { ExternalOpener } from "./open-external";
import { createWebviewRoutes } from "./routes";
import { SWITCHBOARD_KEYS, type Switchboard } from "./switchboard";

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
  const asset = (file: string) =>
    vscode.Uri.joinPath(extensionUri, "dist", "webview", file);
  const boot: WebviewBootConfig = { switchboard };
  return renderWebviewHtml(webview, {
    scripts: [asset("main.js")],
    styles: [asset("app.css"), asset("generative-ui.css"), asset("main.css")],
    title: "Assistant",
    csp: switchboard.csp,
    imgSrc: ["https://icons.duckduckgo.com"],
    surface: switchboard.location,
    scriptType: "classic",
    bodyAttributes: { [BOOT_ATTRIBUTE]: JSON.stringify(boot) },
  });
};

export type AttachedWebview = {
  webview: vscode.Webview;
  switchboard: Switchboard;
  ready: boolean;
};

export class AssistantWebviews implements vscode.Disposable {
  private readonly attached = new Set<AttachedWebview>();
  private readonly pending = new Map<string, (result: unknown) => void>();
  private readonly readyEmitter = new vscode.EventEmitter<void>();
  private readonly externalOpener = new ExternalOpener();
  private readonly routes = createWebviewRoutes(this.externalOpener);
  private nextRequestId = 0;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly storage: vscode.Memento,
  ) {}

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
    };
    this.attached.add(entry);
    const subscription = webview.onDidReceiveMessage((message: unknown) =>
      this.onMessage(entry, message),
    );
    const server = serveWebviewHost(webview, {
      routes: this.routes,
      openExternal: this.externalOpener.open,
      storage: this.storage,
    });
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

  async waitForReady(
    timeoutMs: number,
    accept: (entry: AttachedWebview) => boolean = () => true,
  ) {
    const find = () => {
      const switchboard = readSwitchboard();
      return [...this.attached].findLast(
        (e) =>
          e.ready && sameSwitchboard(e.switchboard, switchboard) && accept(e),
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
    return this.request<ProbeResult>(
      entry,
      (requestId) => ({
        channel: TESTBED_CHANNEL,
        type: "run-probe",
        requestId,
        probeId,
      }),
      timeoutMs,
      { state: "fail", detail: `Timed out after ${timeoutMs} ms` },
    );
  }

  /** Runs a step of a host probe in the webview. */
  async runTask(
    entry: AttachedWebview,
    task: WebviewTaskId,
    arg: unknown,
    timeoutMs: number,
  ) {
    const result = await this.request<TaskResult>(
      entry,
      (requestId) => ({
        channel: TESTBED_CHANNEL,
        type: "run-task",
        requestId,
        task,
        arg,
      }),
      timeoutMs,
      { ok: false, error: `${task} timed out after ${timeoutMs} ms` },
    );
    if (!result.ok) throw new Error(`${task}: ${result.error}`);
    return result.value;
  }

  private request<T>(
    entry: AttachedWebview,
    message: (requestId: string) => HostToWebviewMessage,
    timeoutMs: number,
    onTimeout: T,
  ) {
    const requestId = String(this.nextRequestId++);
    return new Promise<T>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve(onTimeout);
      }, timeoutMs);
      this.pending.set(requestId, (result) => {
        clearTimeout(timer);
        this.pending.delete(requestId);
        resolve(result as T);
      });
      void entry.webview.postMessage(message(requestId));
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
      this.readyEmitter.fire();
    } else {
      this.pending.get(message.requestId)?.(message.result);
    }
  }
}
