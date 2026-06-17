import { useMemo } from "react";
import { formatClockTime, formatMs } from "../../utils/common";
import {
  buildActivityNav,
  defaultActivitySelection,
  EventStreamPane,
  findActivityNode,
  OrphansPane,
  RunDetailPane,
} from "../../views/activity";
import { Chip, PaneHeader, SelectableRow, ToneBadge } from "../../views/ui";
import { NAV_COL, SplitLayout } from "../SplitLayout";
import { useNavSelectionSync } from "./navSelection";
import type { DevToolsTabContext } from "../registry";

const detailTitle = (node: ReturnType<typeof findActivityNode>) => {
  if (!node) return "Activity";
  switch (node.kind) {
    case "stream":
      return "Event stream";
    case "run":
      return `Run #${node.run.index}`;
    case "orphans":
      return "Outside runs";
    default:
      return "Activity";
  }
};

export const ActivityTab = ({
  apiId,
  data,
  clearEvents,
  selection,
  setSelection,
}: DevToolsTabContext) => {
  const logs = data.logs;
  const { nodes, runs } = useMemo(() => buildActivityNav(logs), [logs]);

  const selectedId = useMemo(() => {
    if (selection && findActivityNode(nodes, selection)) return selection;
    return defaultActivitySelection(nodes);
  }, [nodes, selection]);

  useNavSelectionSync(selectedId, selection, setSelection);

  const active = findActivityNode(nodes, selectedId);

  if (!logs.length) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-3 text-[12px]">
        No events logged for this assistant instance.
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
                  {runs.length} runs · {logs.length} events
                </span>
              }
            >
              Activity
            </PaneHeader>
          ),
          children: nodes.map((node) => (
            <SelectableRow
              key={node.id}
              selected={selectedId === node.id}
              dense
              onSelect={() => setSelection(node.id)}
            >
              {node.kind === "stream" ? (
                <span className="text-foreground block py-1.5 font-medium">
                  All events
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {logs.length}
                  </span>
                </span>
              ) : node.kind === "run" ? (
                <div className="flex min-w-0 items-center justify-between gap-2 py-1.5">
                  <span className="text-foreground font-medium">
                    Run #{node.run.index}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {node.run.endTime === undefined ? (
                      <ToneBadge tone="blue" size="sm">
                        running
                      </ToneBadge>
                    ) : (
                      <Chip>{formatMs(node.run.durationMs ?? 0)}</Chip>
                    )}
                    <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                      {formatClockTime(node.run.startTime)}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-foreground block py-1.5 font-medium">
                  Outside runs
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {node.events.length}
                  </span>
                </span>
              )}
            </SelectableRow>
          )),
        },
        {
          key: "detail",
          header: (
            <PaneHeader
              trailing={
                active?.kind === "stream" && logs.length ? (
                  <button
                    type="button"
                    onClick={() => clearEvents(apiId)}
                    className="text-muted-foreground hover:text-foreground text-[11px] leading-none"
                  >
                    clear
                  </button>
                ) : active?.kind === "run" &&
                  active.run.endTime === undefined ? (
                  <ToneBadge tone="blue" size="sm">
                    running
                  </ToneBadge>
                ) : active?.kind === "run" &&
                  active.run.durationMs !== undefined ? (
                  <Chip>{formatMs(active.run.durationMs)}</Chip>
                ) : undefined
              }
            >
              {detailTitle(active)}
            </PaneHeader>
          ),
          children: active ? (
            active.kind === "stream" ? (
              <EventStreamPane logs={logs} />
            ) : active.kind === "run" ? (
              <div className="p-3">
                <RunDetailPane run={active.run} />
              </div>
            ) : (
              <OrphansPane events={active.events} />
            )
          ) : null,
        },
      ]}
    />
  );
};
