"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/ui/cn";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { PANEL_AUTO_SAVE_IDS } from "@/lib/workbench/persistence";
import {
  useIsLeftPanelOpen,
  useIsRightPanelOpen,
  useWorkbenchStore,
} from "@/lib/workbench/store";
import { EditorPanel } from "./editor-panel";
import { PreviewPanel } from "./preview-panel";
import { ActivityPanel } from "./activity-panel";

const HANDLE_CLASSES = "group relative w-4 shrink-0";

const HIGHLIGHT_CLASSES =
  "absolute inset-y-0 w-px bg-linear-to-b from-transparent via-neutral-300 to-transparent opacity-0 group-hover:opacity-100 group-data-resize-handle-active:opacity-100 dark:via-neutral-500 transition-opacity duration-150";

const DEFAULT_SIDE_PANEL_SIZE = 25;

export function WorkbenchLayout() {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const isLeftPanelOpen = useIsLeftPanelOpen();
  const isRightPanelOpen = useIsRightPanelOpen();
  const setLeftPanelOpen = useWorkbenchStore((s) => s.setLeftPanelOpen);
  const setRightPanelOpen = useWorkbenchStore((s) => s.setRightPanelOpen);

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;

    if (isLeftPanelOpen && panel.isCollapsed()) {
      panel.expand();
    } else if (!isLeftPanelOpen && panel.isExpanded()) {
      panel.collapse();
    }
  }, [isLeftPanelOpen]);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;

    if (isRightPanelOpen && panel.isCollapsed()) {
      panel.expand();
    } else if (!isRightPanelOpen && panel.isExpanded()) {
      panel.collapse();
    }
  }, [isRightPanelOpen]);

  return (
    <PanelGroup
      direction="horizontal"
      className="relative flex h-full w-full flex-row"
      autoSaveId={PANEL_AUTO_SAVE_IDS.WORKSPACE_HORIZONTAL}
    >
      <Panel
        ref={leftPanelRef}
        collapsible
        defaultSize={DEFAULT_SIDE_PANEL_SIZE}
        minSize={20}
        collapsedSize={0}
        maxSize={40}
        onCollapse={() => setLeftPanelOpen(false)}
        onExpand={() => setLeftPanelOpen(true)}
      >
        <EditorPanel />
      </Panel>

      <PanelResizeHandle
        className={cn(
          HANDLE_CLASSES,
          "z-80 h-full w-0",
          isLeftPanelOpen ? "cursor-ew-resize" : "cursor-e-resize!",
        )}
        onClick={() => !isLeftPanelOpen && setLeftPanelOpen(true)}
        onDoubleClick={() =>
          leftPanelRef.current?.resize(DEFAULT_SIDE_PANEL_SIZE)
        }
      >
        <div className={`${HIGHLIGHT_CLASSES} absolute left-0 z-20`} />
      </PanelResizeHandle>

      <Panel defaultSize={50} minSize={30}>
        <div
          className={cn(
            "block h-full py-4 pt-0",
            !isLeftPanelOpen && "pl-4",
            !isRightPanelOpen && "pr-4",
          )}
        >
          <PreviewPanel />
        </div>
      </Panel>

      <PanelResizeHandle
        className={cn(
          HANDLE_CLASSES,
          "z-20 h-full w-0",
          isRightPanelOpen ? "cursor-ew-resize" : "cursor-w-resize!",
        )}
        onClick={() => !isRightPanelOpen && setRightPanelOpen(true)}
        onDoubleClick={() =>
          rightPanelRef.current?.resize(DEFAULT_SIDE_PANEL_SIZE)
        }
      >
        <div className={`${HIGHLIGHT_CLASSES} absolute -left-px z-20`} />
      </PanelResizeHandle>

      <Panel
        ref={rightPanelRef}
        collapsible
        defaultSize={DEFAULT_SIDE_PANEL_SIZE}
        minSize={20}
        collapsedSize={0}
        maxSize={40}
        onCollapse={() => setRightPanelOpen(false)}
        onExpand={() => setRightPanelOpen(true)}
      >
        <ActivityPanel />
      </Panel>
    </PanelGroup>
  );
}
