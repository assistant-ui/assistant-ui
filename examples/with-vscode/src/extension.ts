import * as vscode from "vscode";
import { HOST_PROBES } from "./readiness/host-probes";
import { ProbeRunner } from "./readiness/runner";
import { ReadinessTree, type ReadinessNode } from "./readiness/tree";
import { AssistantWebviews, readSwitchboard } from "./webviews";

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
    switchboard: readSwitchboard(),
    webviews,
    showAssistant,
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
