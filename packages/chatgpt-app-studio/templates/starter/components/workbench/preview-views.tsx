"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelGroupHandle,
} from "react-resizable-panels";
import {
  useWorkbenchStore,
  useIsTransitioning,
  useDeviceType,
  useResizableWidth,
  useDisplayMode,
  useIframePreview,
} from "@/lib/workbench/store";
import { DEVICE_PRESETS } from "@/lib/workbench/types";
import { cn } from "@/lib/ui/cn";
import { ComponentContent } from "./component-renderer";
import { IframeComponentContent } from "./iframe-component-content";
import { DeviceFrame } from "./device-frame";
import { ChatThread } from "./chat-thread";
import { MockComposer } from "./mock-composer";

const PREVIEW_MIN_SIZE = 30;
const PREVIEW_MAX_SIZE = 100;
const RESIZABLE_MIN_WIDTH = 280;
const RESIZABLE_MAX_WIDTH = 1200;
const FRAME_VISIBILITY_THRESHOLD = 80;

const RESIZE_HANDLE_CLASSES =
  "absolute top-1/2 left-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300 opacity-40 transition-all group-hover:bg-gray-400 group-hover:opacity-100 group-data-resize-handle-active:bg-gray-500 group-data-resize-handle-active:opacity-100 dark:bg-gray-600 dark:group-hover:bg-gray-500 dark:group-data-resize-handle-active:bg-gray-400";

function PreviewResizeHandle({
  isTransitioning,
}: {
  isTransitioning: boolean;
}) {
  return (
    <PanelResizeHandle
      className={cn(
        "group relative w-4 transition-opacity",
        isTransitioning ? "opacity-0 duration-50" : "opacity-100 duration-300",
      )}
    >
      <div className={RESIZE_HANDLE_CLASSES} />
    </PanelResizeHandle>
  );
}

function WidgetContent() {
  const useIframe = useIframePreview();

  if (useIframe) {
    return <IframeComponentContent className="h-full" />;
  }

  return <ComponentContent className="h-full" />;
}

function ChatWithComposer() {
  const displayMode = useDisplayMode();
  const composerVariant = displayMode === "fullscreen" ? "overlay" : "bottom";

  return (
    <div className="relative h-full w-full">
      <ChatThread>
        <WidgetContent />
      </ChatThread>
      <MockComposer variant={composerVariant} />
    </div>
  );
}

function ResizablePreview() {
  const isTransitioning = useIsTransitioning();
  const resizableWidth = useResizableWidth();
  const setResizableWidth = useWorkbenchStore((s) => s.setResizableWidth);
  const panelGroupRef = useRef<ImperativePanelGroupHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingLayout = useRef(false);

  useEffect(() => {
    if (!panelGroupRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const targetWidth = resizableWidth + 32;
    const centerSize = Math.min(
      PREVIEW_MAX_SIZE,
      Math.max(PREVIEW_MIN_SIZE, (targetWidth / containerWidth) * 100),
    );

    const spacing = (100 - centerSize) / 2;
    isSyncingLayout.current = true;
    panelGroupRef.current.setLayout([spacing, centerSize, spacing]);
  }, [resizableWidth]);

  const handleLayout = useCallback(
    (sizes: number[]) => {
      if (!panelGroupRef.current || !containerRef.current) return;
      if (isSyncingLayout.current) {
        isSyncingLayout.current = false;
        return;
      }

      const [left, center, right] = sizes;
      const clampedCenter = Math.min(
        PREVIEW_MAX_SIZE,
        Math.max(PREVIEW_MIN_SIZE, center),
      );
      const spacing = Math.max(0, (100 - clampedCenter) / 2);
      const epsilon = 0.5;

      const isSymmetric =
        Math.abs(left - spacing) < epsilon &&
        Math.abs(right - spacing) < epsilon &&
        Math.abs(center - clampedCenter) < epsilon;

      if (!isSymmetric) {
        isSyncingLayout.current = true;
        panelGroupRef.current.setLayout([spacing, clampedCenter, spacing]);
      }

      const containerWidth = containerRef.current.offsetWidth;
      const newWidth = Math.round((clampedCenter / 100) * containerWidth - 32);
      const clampedWidth = Math.max(
        RESIZABLE_MIN_WIDTH,
        Math.min(RESIZABLE_MAX_WIDTH, newWidth),
      );
      if (clampedWidth !== resizableWidth) {
        setResizableWidth(clampedWidth);
      }
    },
    [resizableWidth, setResizableWidth],
  );

  return (
    <div
      ref={containerRef}
      className="scrollbar-subtle h-full w-full overflow-hidden bg-dot-grid bg-neutral-100 p-4 dark:bg-neutral-950"
    >
      <div className="flex h-full w-full items-start justify-center">
        <PanelGroup
          ref={panelGroupRef}
          direction="horizontal"
          onLayout={handleLayout}
          className="h-full w-full"
        >
          <Panel defaultSize={5} minSize={0} />
          <PreviewResizeHandle isTransitioning={isTransitioning} />
          <Panel
            defaultSize={90}
            minSize={PREVIEW_MIN_SIZE}
            maxSize={PREVIEW_MAX_SIZE}
          >
            <DeviceFrame className="h-full">
              <ChatWithComposer />
            </DeviceFrame>
          </Panel>
          <PreviewResizeHandle isTransitioning={isTransitioning} />
          <Panel defaultSize={5} minSize={0} />
        </PanelGroup>
      </div>
    </div>
  );
}

function DesktopPreview() {
  return (
    <div className="h-full w-full overflow-hidden bg-dot-grid bg-neutral-100 p-4 dark:bg-neutral-950">
      <div className="h-full w-full overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-700/50">
        <ChatWithComposer />
      </div>
    </div>
  );
}

function FramedPreview() {
  const deviceType = useDeviceType();
  const devicePreset = DEVICE_PRESETS[deviceType];
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const deviceWidth =
    typeof devicePreset.width === "number" ? devicePreset.width : 0;
  const hasMeasured = containerWidth > 0;
  const showFrame =
    hasMeasured && containerWidth > deviceWidth + FRAME_VISIBILITY_THRESHOLD;

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      {showFrame ? (
        <div className="flex h-full w-full items-center justify-center overflow-hidden bg-dot-grid bg-neutral-100 p-4 dark:bg-neutral-950">
          <DeviceFrame
            className="max-h-full"
            style={{
              width: deviceWidth,
              height: "100%",
            }}
          >
            <ChatWithComposer />
          </DeviceFrame>
        </div>
      ) : (
        <ChatWithComposer />
      )}
    </div>
  );
}

export function PreviewContent() {
  const deviceType = useDeviceType();

  if (deviceType === "resizable") {
    return <ResizablePreview />;
  }

  if (deviceType === "desktop") {
    return <DesktopPreview />;
  }

  return <FramedPreview />;
}
