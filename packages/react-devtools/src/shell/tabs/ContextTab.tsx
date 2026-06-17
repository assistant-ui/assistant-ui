import { useMemo } from "react";
import { truncate } from "../../utils/common";
import {
  ContextDetail,
  buildContextNav,
  toolUiCount,
  type ContextNode,
} from "../../views/context";
import { findNavNode, flattenNav } from "../../views/nav";
import { Chip, EmptyState, PaneHeader, SelectableRow } from "../../views/ui";
import { NAV_COL, SplitLayout } from "../SplitLayout";
import { useNavSelectionSync } from "./navSelection";
import type { DevToolsTabContext } from "../registry";

const detailTitle = (
  node: ContextNode | undefined,
  toolUiCountValue: number,
) => {
  if (!node) return "Context";
  switch (node.kind) {
    case "system":
      return "System prompt";
    case "tool":
      return node.tool.name;
    case "callSettings":
      return "Call settings";
    case "config":
      return "Config";
    case "mcp":
      return "MCP";
    case "toolUIs":
      return toolUiCountValue
        ? `Tool UI mappings · ${toolUiCountValue}`
        : "Tool UI mappings";
    default:
      return "Context";
  }
};

export const ContextTab = ({
  data,
  selection,
  setSelection,
}: DevToolsTabContext) => {
  const groups = useMemo(() => buildContextNav(data), [data]);
  const nodes = useMemo(() => flattenNav(groups), [groups]);
  const toolUiCountValue = toolUiCount(data.state.tools);

  const selectedNode = useMemo(() => {
    if (selection && findNavNode(groups, selection)) {
      return selection;
    }
    return nodes[0]?.id ?? null;
  }, [groups, nodes, selection]);

  useNavSelectionSync(selectedNode, selection, setSelection);

  if (!nodes.length) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <EmptyState>
          No model context, MCP, or tool UI data for this instance.
        </EmptyState>
      </div>
    );
  }

  const active = findNavNode(groups, selectedNode);

  return (
    <SplitLayout
      sizes={NAV_COL}
      columns={[
        {
          key: "nav",
          header: <PaneHeader>Context</PaneHeader>,
          children: groups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <div className="text-muted-foreground px-3 pt-2 pb-0.5 text-[10px] font-medium tracking-wide uppercase">
                {group.label}
              </div>
              {group.nodes.map((node) => (
                <SelectableRow
                  key={node.id}
                  selected={selectedNode === node.id}
                  dense
                  onSelect={() => setSelection(node.id)}
                >
                  {node.kind === "system" ? (
                    <div className="flex min-w-0 flex-col gap-0.5 py-1.5">
                      <span className="text-foreground font-medium">
                        System prompt
                      </span>
                      <span className="text-muted-foreground truncate text-[10px]">
                        {truncate(node.preview, 48)}
                      </span>
                    </div>
                  ) : node.kind === "tool" ? (
                    <div className="flex min-w-0 items-center justify-between gap-2 py-1.5">
                      <span className="text-foreground truncate font-medium">
                        {node.tool.name}
                      </span>
                      {node.tool.type ? (
                        <Chip className="shrink-0">{node.tool.type}</Chip>
                      ) : null}
                    </div>
                  ) : node.kind === "callSettings" ? (
                    <span className="text-foreground block py-1.5 font-medium">
                      Call settings
                    </span>
                  ) : node.kind === "config" ? (
                    <span className="text-foreground block py-1.5 font-medium">
                      Config
                    </span>
                  ) : node.kind === "mcp" ? (
                    <span className="text-foreground block py-1.5 font-medium">
                      MCP servers
                    </span>
                  ) : (
                    <span className="text-foreground block py-1.5 font-medium">
                      Tool UI mappings
                      {toolUiCountValue > 0 ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {toolUiCountValue}
                        </span>
                      ) : null}
                    </span>
                  )}
                </SelectableRow>
              ))}
            </div>
          )),
        },
        {
          key: "detail",
          header: (
            <PaneHeader
              trailing={
                active?.kind === "tool" && active.tool.type ? (
                  <Chip>{active.tool.type}</Chip>
                ) : undefined
              }
            >
              {detailTitle(active, toolUiCountValue)}
            </PaneHeader>
          ),
          children: active ? (
            <div className="p-3">
              <ContextDetail node={active} data={data} />
            </div>
          ) : null,
        },
      ]}
    />
  );
};
