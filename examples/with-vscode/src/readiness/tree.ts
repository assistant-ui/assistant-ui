import * as vscode from "vscode";
import {
  isImplemented,
  SWITCHBOARD_KEYS,
  type SwitchboardKey,
} from "../switchboard";
import { readSwitchboard } from "../webviews";
import { PROBES, type Probe } from "./probes";
import type { ProbeRunner, ProbeStatus } from "./runner";

export type ReadinessNode =
  | { kind: "group"; group: "probes" | "switchboard" }
  | { kind: "probe"; probe: Probe }
  | { kind: "setting"; key: SwitchboardKey };

const STATUS_ICONS: Record<ProbeStatus["state"], vscode.ThemeIcon> = {
  pass: new vscode.ThemeIcon(
    "pass",
    new vscode.ThemeColor("testing.iconPassed"),
  ),
  fail: new vscode.ThemeIcon(
    "error",
    new vscode.ThemeColor("testing.iconFailed"),
  ),
  "not-implemented": new vscode.ThemeIcon(
    "circle-slash",
    new vscode.ThemeColor("disabledForeground"),
  ),
  running: new vscode.ThemeIcon("loading~spin"),
};

const STATUS_LABELS: Record<ProbeStatus["state"], string> = {
  pass: "pass",
  fail: "fail",
  "not-implemented": "not implemented",
  running: "running",
};

export class ReadinessTree implements vscode.TreeDataProvider<ReadinessNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private readonly runner: ProbeRunner) {
    runner.onDidChange(() => this.refresh());
  }

  refresh() {
    this.changeEmitter.fire();
  }

  getChildren(node?: ReadinessNode): ReadinessNode[] {
    if (!node) {
      return [
        { kind: "group", group: "probes" },
        { kind: "group", group: "switchboard" },
      ];
    }
    if (node.kind !== "group") return [];
    return node.group === "probes"
      ? PROBES.map((probe) => ({ kind: "probe", probe }))
      : SWITCHBOARD_KEYS.map((key) => ({ kind: "setting", key }));
  }

  getTreeItem(node: ReadinessNode): vscode.TreeItem {
    switch (node.kind) {
      case "group":
        return new vscode.TreeItem(
          node.group === "probes" ? "Probes" : "Switchboard",
          vscode.TreeItemCollapsibleState.Expanded,
        );
      case "probe":
        return this.probeItem(node.probe);
      case "setting":
        return this.settingItem(node.key);
    }
  }

  private probeItem(probe: Probe) {
    const status = this.runner.status(probe.id);
    const item = new vscode.TreeItem(probe.id);
    const detail = status && "detail" in status ? status.detail : undefined;
    item.description = status
      ? [STATUS_LABELS[status.state], detail].filter(Boolean).join(" · ")
      : "not run";
    item.iconPath = status
      ? STATUS_ICONS[status.state]
      : new vscode.ThemeIcon("circle-large-outline");
    item.tooltip = new vscode.MarkdownString(
      [
        `**${probe.id}**: ${probe.description}`,
        `Green by phase ${probe.phase} · ${probe.workstream}`,
        ...(detail ? [detail] : []),
      ].join("\n\n"),
    );
    item.contextValue = "probe";
    return item;
  }

  private settingItem(key: SwitchboardKey) {
    const value = readSwitchboard()[key];
    const implemented = isImplemented(key, value);
    const item = new vscode.TreeItem(`auiTest.${key}`);
    item.description = implemented ? value : `${value} · not implemented`;
    item.iconPath = implemented
      ? new vscode.ThemeIcon("check")
      : new vscode.ThemeIcon(
          "circle-slash",
          new vscode.ThemeColor("list.warningForeground"),
        );
    item.command = {
      command: "workbench.action.openSettings",
      title: "Open Setting",
      arguments: [`auiTest.${key}`],
    };
    return item;
  }
}
