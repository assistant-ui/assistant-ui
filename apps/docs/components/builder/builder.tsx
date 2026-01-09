"use client";

import { useState, useCallback, useRef } from "react";
import { CodeIcon, XIcon, Monitor, Tablet, Smartphone } from "lucide-react";
import type { BuilderConfig } from "./types";
import { BuilderControls } from "./builder-controls";
import { BuilderPreview } from "./builder-preview";
import { BuilderCodeOutput } from "./builder-code-output";
import { cn } from "@/lib/utils";

interface BuilderProps {
  config: BuilderConfig;
  onChange: (config: BuilderConfig) => void;
}

const VIEWPORT_PRESETS = {
  desktop: { width: "100%", label: "Desktop", icon: Monitor },
  tablet: { width: 768, label: "Tablet", icon: Tablet },
  mobile: { width: 375, label: "Mobile", icon: Smartphone },
} as const;

type ViewportPreset = keyof typeof VIEWPORT_PRESETS;

export function Builder({ config, onChange }: BuilderProps) {
  const [showCode, setShowCode] = useState(false);
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset | null>(
    "desktop",
  );
  const [viewportWidth, setViewportWidth] = useState<number | "100%">("100%");
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePresetChange = (preset: ViewportPreset) => {
    setViewportPreset(preset);
    setViewportWidth(VIEWPORT_PRESETS[preset].width);
  };

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
        setViewportPreset(null);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [viewportWidth],
  );

  return (
    <div className="flex h-full w-full gap-4 overflow-hidden bg-background p-4">
      <div className="w-72 shrink-0 overflow-hidden lg:w-80">
        <BuilderControls config={config} onChange={onChange} />
      </div>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/30"
      >
        <div className="flex shrink-0 items-center justify-between border-b bg-background/50 px-3 py-2">
          <div className="flex items-center gap-1">
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
            <span className="ml-2 text-muted-foreground text-xs">
              {viewportWidth === "100%" ? "100%" : `${viewportWidth}px`}
            </span>
          </div>

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
                Close
              </>
            ) : (
              <>
                <CodeIcon className="size-3.5" />
                Code
              </>
            )}
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full items-stretch justify-center p-4">
            {viewportWidth !== "100%" && (
              <div
                onMouseDown={(e) => handleResizeStart(e, "left")}
                className="group flex w-4 shrink-0 cursor-ew-resize items-center justify-center"
              >
                <div className="h-12 w-1 rounded-full bg-border transition-colors group-hover:bg-foreground/30" />
              </div>
            )}

            <div
              className="relative h-full overflow-hidden rounded-lg border bg-background shadow-sm"
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
                className="group flex w-4 shrink-0 cursor-ew-resize items-center justify-center"
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
