import { useMemo } from "react";
import { buildRawNav, RawDetail, type RawNode } from "../../views/raw";
import { findNavNode, firstNavId } from "../../views/nav";
import { Chip, EmptyState, PaneHeader, SelectableRow } from "../../views/ui";
import { NAV_COL, SplitLayout } from "../SplitLayout";
import { useNavSelectionSync } from "./navSelection";
import type { DevToolsTabContext } from "../registry";

const detailTitle = (node: RawNode | undefined) => {
  if (!node) return "Raw";
  if (node.kind === "scopes") return "Scopes";
  return node.key;
};

export const RawTab = ({
  data,
  selection,
  setSelection,
}: DevToolsTabContext) => {
  const groups = useMemo(() => buildRawNav(data), [data]);
  const sliceCount = Object.keys(data.state).length;

  const selectedId = useMemo(() => {
    if (selection && findNavNode(groups, selection)) return selection;
    return firstNavId(groups);
  }, [groups, selection]);

  useNavSelectionSync(selectedId, selection, setSelection);

  const active = findNavNode(groups, selectedId);

  if (!groups.length) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <EmptyState>No runtime state reported for this instance.</EmptyState>
      </div>
    );
  }

  return (
    <SplitLayout
      sizes={NAV_COL}
      columns={[
        {
          key: "nav",
          header: (
            <PaneHeader
              trailing={
                <span>
                  {sliceCount} slice{sliceCount === 1 ? "" : "s"}
                </span>
              }
            >
              Raw
            </PaneHeader>
          ),
          children: groups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <div className="text-muted-foreground px-3 pt-2 pb-0.5 text-[10px] font-medium tracking-wide uppercase">
                {group.label}
              </div>
              {group.nodes.map((node) => (
                <SelectableRow
                  key={node.id}
                  selected={selectedId === node.id}
                  dense
                  onSelect={() => setSelection(node.id)}
                >
                  {node.kind === "slice" ? (
                    <div className="flex min-w-0 items-center justify-between gap-2 py-1.5">
                      <span className="text-foreground truncate font-medium">
                        {node.key}
                      </span>
                      {node.hint ? (
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {node.hint}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center justify-between gap-2 py-1.5">
                      <span className="text-foreground font-medium">
                        scopes
                      </span>
                      {node.count ? (
                        <Chip className="shrink-0">{node.count}</Chip>
                      ) : null}
                    </div>
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
                active?.kind === "slice" && active.hint ? (
                  <span>{active.hint}</span>
                ) : active?.kind === "scopes" && active.count ? (
                  <Chip>{active.count}</Chip>
                ) : undefined
              }
            >
              {detailTitle(active)}
            </PaneHeader>
          ),
          children: active ? (
            <div className="p-3">
              <RawDetail
                node={active}
                state={data.state}
                scopes={data.scopes}
              />
            </div>
          ) : null,
        },
      ]}
    />
  );
};
