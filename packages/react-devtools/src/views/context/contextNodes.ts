import type { ApiInfo } from "../../data/types";
import type { NormalizedTool } from "../../utils/toolNormalization";
import { isRecord } from "../../utils/common";
import type { NavGroup } from "../nav";

export type ContextNode =
  | { id: "ctx:system"; kind: "system"; preview: string }
  | { id: `ctx:tool:${string}`; kind: "tool"; tool: NormalizedTool }
  | { id: "ctx:callSettings"; kind: "callSettings" }
  | { id: "ctx:config"; kind: "config" }
  | { id: "ctx:mcp"; kind: "mcp" }
  | { id: "ctx:toolUIs"; kind: "toolUIs" };

export type ContextNavGroup = NavGroup<ContextNode>;

const hasKeys = (value: Record<string, unknown> | undefined) =>
  Boolean(value && Object.keys(value).length > 0);

export const buildContextNav = (data: ApiInfo): ContextNavGroup[] => {
  const model = data.modelContext;
  const modelNodes: ContextNode[] = [];

  if (model?.system) {
    modelNodes.push({
      id: "ctx:system",
      kind: "system",
      preview: model.system,
    });
  }

  const nextToolOccurrence = new Map<string, number>();
  const toolNodeIds = new Set<string>();
  for (const tool of model?.tools ?? []) {
    const baseId = `ctx:tool:${tool.name}` as const;
    let occurrence = nextToolOccurrence.get(tool.name) ?? 1;
    let id: `ctx:tool:${string}` =
      occurrence === 1 ? baseId : `${baseId}:${occurrence}`;
    while (toolNodeIds.has(id)) {
      occurrence += 1;
      id = `${baseId}:${occurrence}`;
    }
    nextToolOccurrence.set(tool.name, occurrence + 1);
    toolNodeIds.add(id);
    modelNodes.push({
      id,
      kind: "tool",
      tool,
    });
  }

  if (hasKeys(model?.callSettings)) {
    modelNodes.push({ id: "ctx:callSettings", kind: "callSettings" });
  }

  if (hasKeys(model?.config)) {
    modelNodes.push({ id: "ctx:config", kind: "config" });
  }

  const runtimeNodes: ContextNode[] = [];

  if (data.state.mcp !== undefined) {
    runtimeNodes.push({ id: "ctx:mcp", kind: "mcp" });
  }

  if (data.state.tools !== undefined) {
    runtimeNodes.push({ id: "ctx:toolUIs", kind: "toolUIs" });
  }

  return [
    ...(modelNodes.length ? [{ label: "Model", nodes: modelNodes }] : []),
    ...(runtimeNodes.length ? [{ label: "Runtime", nodes: runtimeNodes }] : []),
  ];
};

export const toolUiCount = (value: unknown) => {
  if (!isRecord(value)) return 0;
  return Object.keys(value).length;
};
