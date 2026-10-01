import * as vscode from "vscode";
import type { GalleryView, WebviewTaskId } from "./protocol";
import { HOST_PROBES } from "./readiness/host-probes";
import {
  PROBE_TIMEOUT_MS,
  ProbeRunner,
  WEBVIEW_READY_TIMEOUT_MS,
} from "./readiness/runner";
import { ReadinessTree, type ReadinessNode } from "./readiness/tree";
import {
  AssistantWebviews,
  isAssistant,
  isGallery,
  readSwitchboard,
} from "./webviews";

const VIEW_IDS = {
  sidebar: "auiTest.assistant",
  panel: "auiTest.assistantPanel",
} as const;

export function activate(context: vscode.ExtensionContext) {
  const webviews = new AssistantWebviews(
    context.extensionUri,
    context.globalState,
  );
  let editorPanel: vscode.WebviewPanel | undefined;

  const openEditorPanel = () => {
    if (editorPanel) {
      editorPanel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "auiTest.assistantEditor",
      "Assistant",
      vscode.ViewColumn.Active,
    );
    const attachment = webviews.attach(panel.webview);
    panel.onDidChangeViewState(() => {
      if (!panel.visible) attachment.hidden();
    });
    panel.onDidDispose(() => {
      attachment.dispose();
      if (editorPanel === panel) editorPanel = undefined;
    });
    editorPanel = panel;
  };

  let gallery:
    | { panel: vscode.WebviewPanel; show(view: GalleryView): void }
    | undefined;

  /**
   * Opens the component gallery in an editor tab, or reveals it. A `view`
   * (such as `{ section: "markdown-text", width: 320 }`) re-renders it.
   */
  const openGallery = async (view?: Partial<GalleryView>) => {
    const next: GalleryView | undefined = view && {
      section: view.section ?? null,
      width: view.width ?? null,
    };
    if (gallery) {
      if (next) gallery.show(next);
      gallery.panel.reveal(undefined, true);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "auiTest.gallery",
      "Component Gallery",
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
    );
    const attachment = webviews.attach(
      panel.webview,
      next ?? { section: null, width: null },
    );
    panel.onDidChangeViewState(() => {
      if (!panel.visible) attachment.hidden();
    });
    panel.onDidDispose(() => {
      attachment.dispose();
      if (gallery?.panel === panel) gallery = undefined;
    });
    gallery = { panel, show: attachment.show };
  };

  const showAssistant = async () => {
    const { location } = readSwitchboard();
    if (location === "editor") {
      openEditorPanel();
    } else {
      await vscode.commands.executeCommand(`${VIEW_IDS[location]}.focus`);
    }
  };

  const viewProvider: vscode.WebviewViewProvider = {
    resolveWebviewView(view) {
      const attachment = webviews.attach(view.webview);
      view.onDidChangeVisibility(() => {
        if (!view.visible) attachment.hidden();
      });
      view.onDidDispose(() => attachment.dispose());
    },
  };

  const runner = new ProbeRunner(HOST_PROBES, () => ({
    extensionPath: context.extensionPath,
    switchboard: readSwitchboard(),
    webviews,
    showAssistant,
    openGallery,
  }));
  const tree = new ReadinessTree(runner);

  context.subscriptions.push(
    webviews,
    runner,
    ...Object.values(VIEW_IDS).map((id) =>
      vscode.window.registerWebviewViewProvider(id, viewProvider),
    ),
    vscode.window.registerTreeDataProvider("auiTest.readiness", tree),
    vscode.commands.registerCommand("auiTest.runAllProbes", () =>
      runner.runAll(),
    ),
    vscode.commands.registerCommand(
      "auiTest.runProbe",
      (node: ReadinessNode) => {
        if (node.kind === "probe") return runner.run(node.probe.id);
        return undefined;
      },
    ),
    vscode.commands.registerCommand("auiTest.showAssistant", showAssistant),
    vscode.commands.registerCommand("auiTest.openGallery", openGallery),
    // Not contributed: the screenshot run drives the webviews through it.
    vscode.commands.registerCommand(
      "auiTest.runWebviewTask",
      async ({
        target,
        task,
        arg,
      }: {
        target: "assistant" | "gallery";
        task: WebviewTaskId;
        arg?: unknown;
      }) => {
        if (target === "gallery") await openGallery();
        else await showAssistant();
        const entry = await webviews.waitForReady(
          WEBVIEW_READY_TIMEOUT_MS,
          target === "gallery" ? isGallery : isAssistant,
        );
        if (!entry) throw new Error(`The ${target} webview was not ready`);
        return webviews.runTask(entry, task, arg, PROBE_TIMEOUT_MS);
      },
    ),
    vscode.commands.registerCommand("auiTest.reloadWebview", () =>
      webviews.reloadAll(),
    ),
    vscode.commands.registerCommand("auiTest.openSettings", () =>
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "auiTest",
      ),
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("auiTest")) return;
      tree.refresh();
      if (readSwitchboard().location !== "editor") editorPanel?.dispose();
      webviews.reloadAll();
      if (event.affectsConfiguration("auiTest.location")) void showAssistant();
    }),
  );

  if (readSwitchboard().location === "editor") openEditorPanel();
}

export function deactivate() {}
