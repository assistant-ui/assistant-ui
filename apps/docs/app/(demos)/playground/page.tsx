"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { BuilderControls } from "@/components/builder/builder-controls";
import { BuilderPreview } from "@/components/builder/builder-preview";
import { BuilderCodeOutput } from "@/components/builder/builder-code-output";
import { ShareButton } from "@/components/builder/share-button";
import { CreateDialog } from "@/components/builder/create-dialog";
import {
  PlaygroundChatProvider,
  PlaygroundChatThread,
} from "@/components/builder/builder-chat-sidebar";
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

const XuluxApp = dynamic(() =>
  import("@/components/xulux/XuluxApp").then((mod) => mod.XuluxApp),
);

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

  const content = (
    <div className="bg-background flex h-full w-full gap-4 overflow-hidden p-2 md:p-4">
      <div className="hidden w-72 shrink-0 overflow-hidden md:block lg:w-80">
        <BuilderControls config={config} onChange={setConfig} />
      </div>

      <div
        ref={containerRef}
        className="bg-muted/30 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border"
      >
        <div className="bg-background/50 flex shrink-0 items-center justify-between border-b px-2 py-2 md:px-3">
          <div className="hidden items-center gap-1 md:flex">
            {(Object.keys(VIEWPORT_PRESETS) as ViewportPreset[]).map((key) => {
              const preset = VIEWPORT_PRESETS[key];
              const Icon = preset.icon;
              return (
                <button
                  type="button"
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
            <code className="bg-muted text-muted-foreground ml-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-black/5 ring-inset dark:ring-white/10">
              {viewportWidth === "100%" ? "100%" : `${viewportWidth}px`}
            </code>
          </div>

          <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors md:hidden"
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
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              aria-label="New thread"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New Thread</span>
            </ThreadListPrimitive.New>

            <ShareButton />

            {isAiPlaygroundEnabled && (
              <button
                type="button"
                onClick={() => setShowChat(!showChat)}
                className={cn(
                  "hidden items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors md:flex",
                  showChat
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">AI</span>
              </button>
            )}

            {isAiPlaygroundEnabled && (
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors md:hidden"
                    aria-label="Open AI chat"
                  >
                    <Sparkles className="size-3.5" />
                  </button>
                </SheetTrigger>
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
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
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
              <button
                type="button"
                className="bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              >
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
                <div className="bg-border group-hover:bg-foreground/30 h-12 w-1 rounded-full transition-colors" />
              </div>
            )}

            <div
              className="bg-background relative h-full overflow-hidden rounded-lg border shadow-sm max-md:!w-full"
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
                  <div className="bg-background/90 absolute inset-0 z-4 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="bg-background ring-border flex items-center gap-2 rounded-lg px-4 py-2.5 shadow-lg ring-1">
                      <Loader2 className="text-muted-foreground size-4 animate-spin" />
                      <span className="text-muted-foreground text-sm font-medium">
                        Applying changes
                      </span>
                    </div>
                  </div>
                )}

              {showCode && (
                <div className="bg-card absolute inset-0 z-5 overflow-hidden">
                  <BuilderCodeOutput config={config} />
                </div>
              )}
            </div>

            {viewportWidth !== "100%" && (
              <div
                onMouseDown={(e) => handleResizeStart(e, "right")}
                className="group hidden w-4 shrink-0 cursor-ew-resize items-center justify-center md:flex"
              >
                <div className="bg-border group-hover:bg-foreground/30 h-12 w-1 rounded-full transition-colors" />
              </div>
            )}
          </div>
        </div>
      </div>

      {isAiPlaygroundEnabled && showChat && (
        <div className="bg-background hidden h-full shrink-0 flex-col overflow-hidden rounded-xl border md:flex md:w-80">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">AI Assistant</span>
            <button
              type="button"
              onClick={() => setShowChat(false)}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
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

  return isAiPlaygroundEnabled ? (
    <PlaygroundChatProvider config={config} setConfig={setConfig}>
      {content}
    </PlaygroundChatProvider>
  ) : (
    content
  );
}

function HeaderPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(
      document.querySelector<HTMLElement>("[data-sub-project-header-portal]"),
    );
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}

export default function PlaygroundPage() {
  const [mode, setMode] = useState<"agent" | "builder">(
    isAiPlaygroundEnabled ? "agent" : "builder",
  );

  return (
    <>
      {isAiPlaygroundEnabled && (
        <HeaderPortal>
          <div className="bg-muted/40 grid grid-cols-2 rounded-md border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("agent")}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors",
                mode === "agent"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              AI Builder
            </button>
            <button
              type="button"
              onClick={() => setMode("builder")}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors",
                mode === "builder"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              UI Builder
            </button>
          </div>
        </HeaderPortal>
      )}

      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        {isAiPlaygroundEnabled && mode === "agent" ? (
          <XuluxApp />
        ) : (
          <BuilderPlayground />
        )}
      </div>
    </>
  );
}
