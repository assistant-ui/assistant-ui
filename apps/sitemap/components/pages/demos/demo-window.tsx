"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PartsOverlay } from "./parts-overlay";

/** One of a demo's files, highlighted for the Code tab. */
export type DemoFile = { name: string; code: ReactNode };

const BODY: CSSProperties = { height: "36rem" };

const FULL_BODY: CSSProperties = { height: "calc(100dvh - 2.75rem)" };

const TARGET_LINE =
  "color-mix(in oklab, var(--color-blue-500) 14%, transparent)";

/**
 * A demo's files in a window, with a switch between the preview and the
 * code: the title bar names the main file in the preview and has a tab per
 * file in the code. The preview stays mounted while the code is open, so a
 * test chat survives a look at the code. With `parts`, a Parts switch outlines
 * each part of the preview and names its component; a name opens the first
 * file at that component. Full screen fills the viewport with the same window
 * until Escape or the button closes it.
 */
export function DemoWindow({
  files,
  preview,
  parts = false,
}: {
  files: readonly [DemoFile, ...DemoFile[]];
  preview: ReactNode;
  parts?: boolean;
}) {
  const [fileName, setFileName] = useState(files[0].name);
  const file = files.find((entry) => entry.name === fileName) ?? files[0];
  const [tab, setTab] = useState("preview");
  const [showParts, setShowParts] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab !== "code" || target === null) return;
    const frame = requestAnimationFrame(() => {
      const panel = codeRef.current;
      if (!panel) return;
      const line = [...panel.querySelectorAll<HTMLElement>(".line")].find(
        (element) => element.textContent?.includes(`function ${target}(`),
      );
      if (!line) return;
      line.style.background = TARGET_LINE;
      const lineRect = line.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      panel.scrollTop += lineRect.top - panelRect.top - panel.clientHeight / 3;
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, target]);

  useEffect(() => {
    if (!full) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setFull(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      root.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [full]);

  const body = full ? FULL_BODY : BODY;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        setTab(value);
        if (value === "preview") setTarget(null);
      }}
      className={cn(
        "border-foreground/10 bg-background min-w-0 gap-0 overflow-hidden border",
        full
          ? "fixed inset-0 z-[60] rounded-none border-0"
          : "rounded-document",
      )}
    >
      <div className="border-foreground/10 flex h-11 items-center justify-between gap-3 border-b ps-4 pe-1.5">
        {tab === "preview" ? (
          <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
            {files[0].name}
          </span>
        ) : (
          <div
            role="group"
            aria-label="Files"
            className="-ms-2 flex min-w-0 [scrollbar-width:none] items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          >
            {files.map((entry) => {
              const open = entry.name === file.name;
              return (
                <button
                  key={entry.name}
                  type="button"
                  aria-pressed={open}
                  onClick={() => setFileName(entry.name)}
                  className={cn(
                    "focus-visible:ring-ring h-8 shrink-0 rounded-md px-2 font-mono text-xs transition-colors outline-none focus-visible:ring-2",
                    open
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {entry.name}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          {parts && tab === "preview" ? (
            <button
              type="button"
              aria-pressed={showParts}
              onClick={() => setShowParts((shown) => !shown)}
              className={cn(
                "h-8 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                showParts
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Parts
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={full}
            aria-label={full ? "Exit full screen" : "Show in full screen"}
            title={full ? "Exit full screen" : "Show in full screen"}
            onClick={() => setFull((on) => !on)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 items-center justify-center rounded-md transition-colors"
          >
            {full ? (
              <Minimize2Icon aria-hidden className="size-4" />
            ) : (
              <Maximize2Icon aria-hidden className="size-4" />
            )}
          </button>
          <TabsList
            aria-label={`${files[0].name}: code or preview`}
            className="h-8"
          >
            <TabsTrigger value="code" className="px-2.5 text-[13px]">
              Code
            </TabsTrigger>
            <TabsTrigger value="preview" className="px-2.5 text-[13px]">
              Preview
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
      <TabsContent
        value="preview"
        keepMounted
        className="relative flex-none"
        style={body}
      >
        <div ref={previewRef} className="h-full">
          {preview}
        </div>
        {parts && showParts ? (
          <PartsOverlay
            container={previewRef}
            onSelect={(component) => {
              setTarget(component);
              setFileName(files[0].name);
              setTab("code");
            }}
          />
        ) : null}
      </TabsContent>
      <TabsContent value="code" className="min-w-0 flex-none" style={body}>
        <div key={file.name} ref={codeRef} className="h-full overflow-auto">
          <div className="px-5 py-4 font-mono text-[13px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre">
            {file.code}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
