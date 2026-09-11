"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useHeaderPortalContainer } from "@/hooks/use-header-portal-container";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  CodeIcon,
  XIcon,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  SlidersHorizontal,
  Sparkles,
  SquareTerminal,
  Loader2,
} from "lucide-react";
import { ThreadListPrimitive } from "@assistant-ui/react";
import { BuilderControls } from "@/components/pages/playground/builder-controls";
import { BuilderPreview } from "@/components/pages/playground/builder-preview";
import { BuilderCodeOutput } from "@/components/pages/playground/builder-code-output";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/pages/playground/share-button";
import { CreateDialog } from "@/components/pages/playground/create-dialog";
import {
  PlaygroundChatProvider,
  PlaygroundChatThread,
} from "@/components/pages/playground/builder-chat-sidebar";
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
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { PlaygroundRuntimeProvider } from "@/runtimes/playground";

const XuluxApp = isAiPlaygroundEnabled
  ? dynamic(() =>
      import("@/components/xulux/XuluxApp").then((mod) => mod.XuluxApp),
    )
  : null;

const VIEWPORT_PRESETS = {
  desktop: { width: "100%" as const, label: "Desktop", icon: Monitor },
  tablet: { width: 768, label: "Tablet", icon: Tablet },
  mobile: { width: 375, label: "Mobile", icon: Smartphone },
} as const;

function BuilderPlayground() {
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
  const [showChat, setShowChat] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
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

  const toolBtn =
    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors";
  const toolBtnOn = "bg-foreground/6 text-foreground";
  const toolBtnOff = "text-foreground/45 hover:text-foreground/90";

  const content = (
    <div className="flex h-full w-full overflow-hidden">
      <div className="border-foreground/10 hidden w-72 shrink-0 overflow-hidden border-r md:block lg:w-80">
        <div className="h-full overflow-y-auto px-4 py-4">
          <BuilderControls config={config} onChange={setConfig} />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <div className="border-foreground/10 flex h-12 shrink-0 items-center justify-between border-b px-4">
          <div className="hidden items-center gap-0.5 md:flex">
            {(Object.keys(VIEWPORT_PRESETS) as ViewportPreset[]).map((key) => {
              const preset = VIEWPORT_PRESETS[key];
              const Icon = preset.icon;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={cn(
                    toolBtn,
                    viewportPreset === key ? toolBtnOn : toolBtnOff,
                  )}
                >
                  <Icon className="size-3.5" />
                  {preset.label}
                </button>
              );
            })}
            <span className="text-foreground/30 ml-1.5 font-mono text-[11px] tabular-nums">
              {viewportWidth === "100%" ? "100%" : `${viewportWidth}px`}
            </span>
          </div>

          <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  aria-label="Open controls"
                >
                  <SlidersHorizontal className="size-4" />
                  <span>Customize</span>
                </Button>
              }
            />
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

          <div className="flex items-center gap-0.5">
            <ThreadListPrimitive.New
              className={cn(toolBtn, toolBtnOff)}
              aria-label="New thread"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New Thread</span>
            </ThreadListPrimitive.New>

            <ShareButton className={toolBtn} />

            {isAiPlaygroundEnabled && (
              <button
                type="button"
                onClick={() => setShowChat(!showChat)}
                className={cn(
                  toolBtn,
                  "hidden md:flex",
                  showChat ? toolBtnOn : toolBtnOff,
                )}
              >
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">AI</span>
              </button>
            )}

            {isAiPlaygroundEnabled && (
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger
                  render={
                    <button
                      type="button"
                      className={cn(toolBtn, toolBtnOff, "md:hidden")}
                      aria-label="Open AI chat"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                  }
                />
                <SheetContent
                  side="bottom"
                  className="flex h-[85vh] flex-col overflow-hidden rounded-t-2xl p-0"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>AI Assistant</SheetTitle>
                  </SheetHeader>
                  <PlaygroundChatThread onRunningChange={setAiRunning} />
                </SheetContent>
              </Sheet>
            )}

            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className={cn(toolBtn, showCode ? toolBtnOn : toolBtnOff)}
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
              <Button type="button" variant="outline" size="sm">
                <SquareTerminal className="size-3.5" />
                <span className="hidden sm:inline">Create Project</span>
              </Button>
            </CreateDialog>
          </div>
        </div>

        <div
          ref={previewContainerRef}
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden",
            viewportWidth !== "100%" && "bg-foreground/[0.025] px-4 py-4",
          )}
        >
          <div className="flex h-full items-stretch justify-center">
            {viewportWidth !== "100%" && (
              <div
                onMouseDown={(e) => handleResizeStart(e, "left")}
                className="group hidden w-4 shrink-0 cursor-ew-resize items-center justify-center md:flex"
              >
                <div className="bg-foreground/15 group-hover:bg-foreground/30 h-12 w-px transition-colors" />
              </div>
            )}

            <div
              className={cn(
                "bg-background relative h-full overflow-hidden max-md:!w-full",
                viewportWidth === "100%"
                  ? "w-full"
                  : "border-foreground/10 rounded-[20px] border",
              )}
              style={{
                width: viewportWidth === "100%" ? "100%" : viewportWidth,
                maxWidth: "100%",
              }}
            >
              <BuilderPreview config={config} />

              {isAiPlaygroundEnabled &&
                aiRunning &&
                !showCode &&
                !mobileSheetOpen && (
                  <div className="bg-background/80 absolute inset-0 z-4 flex items-center justify-center backdrop-blur-md">
                    <div className="text-foreground/55 flex items-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin" />
                      Applying changes
                    </div>
                  </div>
                )}

              {showCode && (
                <div className="bg-background absolute inset-0 z-5 overflow-hidden">
                  <BuilderCodeOutput config={config} />
                </div>
              )}
            </div>

            {viewportWidth !== "100%" && (
              <div
                onMouseDown={(e) => handleResizeStart(e, "right")}
                className="group hidden w-4 shrink-0 cursor-ew-resize items-center justify-center md:flex"
              >
                <div className="bg-foreground/15 group-hover:bg-foreground/30 h-12 w-px transition-colors" />
              </div>
            )}
          </div>
        </div>
      </div>

      {isAiPlaygroundEnabled && showChat && (
        <div className="border-foreground/10 hidden h-full w-80 shrink-0 flex-col overflow-hidden border-l md:flex">
          <div className="border-foreground/10 flex h-12 items-center justify-between border-b px-4">
            <span className="text-sm font-medium">AI Assistant</span>
            <button
              type="button"
              onClick={() => setShowChat(false)}
              className="text-foreground/45 hover:text-foreground/90 flex size-8 items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <PlaygroundChatThread onRunningChange={setAiRunning} />
        </div>
      )}
    </div>
  );

  return (
    <PlaygroundRuntimeProvider>
      <PlaygroundChatProvider config={config} setConfig={setConfig}>
        {content}
      </PlaygroundChatProvider>
    </PlaygroundRuntimeProvider>
  );
}

function HeaderPortal({ children }: { children: ReactNode }) {
  const container = useHeaderPortalContainer();

  if (!container) return null;
  return createPortal(children, container);
}

export default function PlaygroundPage() {
  const [mode, setMode] = useState<"agent" | "builder">(
    isAiPlaygroundEnabled ? "agent" : "builder",
  );
  const [visitedModes, setVisitedModes] = useState({
    agent: isAiPlaygroundEnabled,
    builder: !isAiPlaygroundEnabled,
  });

  const handleModeChange = useCallback((nextMode: "agent" | "builder") => {
    setMode(nextMode);
    setVisitedModes((current) => ({
      ...current,
      [nextMode]: true,
    }));
  }, []);

  return (
    <>
      {isAiPlaygroundEnabled && (
        <HeaderPortal>
          <div className="bg-muted/70 grid grid-cols-2 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => handleModeChange("agent")}
              className={cn(
                "rounded-sm px-2.5 py-1 font-medium transition-colors",
                mode === "agent"
                  ? "bg-background text-foreground"
                  : "text-foreground/45 hover:text-foreground/90",
              )}
            >
              AI Builder
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("builder")}
              className={cn(
                "rounded-sm px-2.5 py-1 font-medium transition-colors",
                mode === "builder"
                  ? "bg-background text-foreground"
                  : "text-foreground/45 hover:text-foreground/90",
              )}
            >
              UI Builder
            </button>
          </div>
        </HeaderPortal>
      )}

      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        {XuluxApp && visitedModes.agent && (
          <div
            className={cn(
              "h-full min-h-0 w-full flex-col overflow-hidden",
              mode === "agent" ? "flex" : "hidden",
            )}
            aria-hidden={mode !== "agent"}
          >
            <XuluxApp />
          </div>
        )}
        {visitedModes.builder && (
          <div
            className={cn(
              "h-full min-h-0 w-full flex-col overflow-hidden",
              mode === "builder" ? "flex" : "hidden",
            )}
            aria-hidden={mode !== "builder"}
          >
            <BuilderPlayground />
          </div>
        )}
      </div>
    </>
  );
}
