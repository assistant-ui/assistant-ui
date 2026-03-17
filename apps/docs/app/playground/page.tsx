"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CodeIcon,
  XIcon,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  SlidersHorizontal,
  SquareTerminal,
} from "lucide-react";
import { ThreadListPrimitive } from "@assistant-ui/react";
import { BuilderControls } from "@/components/builder/builder-controls";
import { BuilderPreview } from "@/components/builder/builder-preview";
import { BuilderCodeOutput } from "@/components/builder/builder-code-output";
import { ShareButton } from "@/components/builder/share-button";
import { CreateDialog } from "@/components/builder/create-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  usePlaygroundState,
  type ViewportPreset,
} from "@/lib/playground-url-state";

const VIEWPORT_PRESETS = {
  desktop: { width: "100%" as const, label: "Desktop", icon: Monitor },
  tablet: { width: 768, label: "Tablet", icon: Tablet },
  mobile: { width: 375, label: "Mobile", icon: Smartphone },
} as const;

export default function PlaygroundPage() {
  const {
    config,
    showCode,
    viewportPreset,
    viewportWidth,
    setConfig,
    setShowCode,
    setViewportPreset,
    setViewportWidth,
  } = usePlaygroundState();

  const [controlsOpen, setControlsOpen] = useState(false);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const handlePresetChange = useCallback(
    (preset: ViewportPreset) => {
      setViewportPreset(preset);
    },
    [setViewportPreset],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, side: "left" | "right") => {
      e.preventDefault();
      isResizing.current = true;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth =
        viewportWidth === "100%"
          ? (containerRef.current?.offsetWidth ?? 800)
          : viewportWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const delta =
          side === "right" ? e.clientX - startX : startX - e.clientX;
        const newWidth = Math.max(320, startWidth + delta * 2);
        setViewportWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        cleanupRef.current = null;
      };

      cleanupRef.current = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [viewportWidth, setViewportWidth],
  );

  return (
    <div className="flex h-full w-full gap-4 overflow-hidden bg-background p-2 md:p-4">
      <div className="hidden w-72 shrink-0 overflow-hidden md:block lg:w-80">
        <BuilderControls config={config} onChange={setConfig} />
      </div>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/30"
      >
        <div className="flex shrink-0 items-center justify-between border-b bg-background/50 px-2 py-2 md:px-3">
          <div className="hidden items-center gap-1 md:flex">
            {(Object.keys(VIEWPORT_PRESETS) as ViewportPreset[]).map((key) => {
              const preset = VIEWPORT_PRESETS[key];
              const Icon = preset.icon;
              return (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                    viewportPreset === key
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {preset.label}
                </button>
              );
            })}
            <code className="ml-1.5 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground ring-1 ring-black/5 ring-inset dark:ring-white/10">
              {viewportWidth === "100%" ? "100%" : `${viewportWidth}px`}
            </code>
          </div>

          <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
            <SheetTrigger asChild>
              <button
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-foreground/5 hover:text-foreground md:hidden"
                aria-label="Open controls"
              >
                <SlidersHorizontal className="size-4" />
                <span>Customize</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[85vh] overflow-hidden rounded-t-2xl"
            >
              <SheetHeader>
                <SheetTitle>Customize</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-3rem)] overflow-y-auto px-4 pb-8">
                <BuilderControls config={config} onChange={setConfig} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-1">
            <ThreadListPrimitive.New
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
              aria-label="New thread"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New Thread</span>
            </ThreadListPrimitive.New>

            <ShareButton />

            <button
              onClick={() => setShowCode(!showCode)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors",
                showCode
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {showCode ? (
                <>
                  <XIcon className="size-3.5" />
                  <span className="hidden sm:inline">Close</span>
                </>
              ) : (
                <>
                  <CodeIcon className="size-3.5" />
                  <span className="hidden sm:inline">Code</span>
                </>
              )}
            </button>

            <CreateDialog
              config={config}
              container={previewContainerRef}
              onOpenCodeView={() => setShowCode(true)}
            >
              <button className="flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1 font-medium text-background text-xs transition-colors hover:bg-foreground/90">
                <SquareTerminal className="size-3.5" />
                <span className="hidden sm:inline">Create Project</span>
              </button>
            </CreateDialog>
          </div>
        </div>

        <div
          ref={previewContainerRef}
          className="relative min-h-0 flex-1 overflow-hidden"
        >
          <div className="flex h-full items-stretch justify-center p-2 md:p-4">
            {viewportWidth !== "100%" && (
              <div
                onMouseDown={(e) => handleResizeStart(e, "left")}
                className="group hidden w-4 shrink-0 cursor-ew-resize items-center justify-center md:flex"
              >
                <div className="h-12 w-1 rounded-full bg-border transition-colors group-hover:bg-foreground/30" />
              </div>
            )}

            <div
              className="max-md:!w-full relative h-full overflow-hidden rounded-lg border bg-background shadow-sm"
              style={{
                width: viewportWidth === "100%" ? "100%" : viewportWidth,
                maxWidth: "100%",
              }}
            >
              <BuilderPreview config={config} />

              {showCode && (
                <div className="absolute inset-0 z-[5] overflow-hidden bg-card">
                  <BuilderCodeOutput config={config} />
                </div>
              )}
            </div>

            {viewportWidth !== "100%" && (
              <div
                onMouseDown={(e) => handleResizeStart(e, "right")}
                className="group hidden w-4 shrink-0 cursor-ew-resize items-center justify-center md:flex"
              >
                <div className="h-12 w-1 rounded-full bg-border transition-colors group-hover:bg-foreground/30" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
