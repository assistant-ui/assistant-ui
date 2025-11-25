"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BuilderConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { BuilderControls } from "./builder-controls";
import { BuilderPreview } from "./builder-preview";
import { BuilderCodeOutput } from "./builder-code-output";

export function Builder() {
  const [config, setConfig] = useState<BuilderConfig>(DEFAULT_CONFIG);
  const [showControls, setShowControls] = useState(true);
  const [showCode, setShowCode] = useState(true);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowControls(!showControls)}
          >
            {showControls ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
            <span className="hidden sm:inline">Controls</span>
          </Button>
        </div>

        <h2 className="text-sm font-semibold">Playground</h2>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? (
              <Eye className="size-4" />
            ) : (
              <Code2 className="size-4" />
            )}
            <span className="hidden sm:inline">
              {showCode ? "Preview" : "Code"}
            </span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Controls Panel */}
        <div
          className={cn(
            "w-80 shrink-0 overflow-hidden border-r bg-background transition-all duration-300",
            showControls ? "translate-x-0" : "-ml-80 w-0",
          )}
        >
          <BuilderControls config={config} onChange={setConfig} />
        </div>

        {/* Preview / Code Panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {showCode ? (
            <div className="grid flex-1 grid-rows-2 overflow-hidden lg:grid-cols-2 lg:grid-rows-1">
              {/* Preview */}
              <div className="overflow-hidden border-b lg:border-r lg:border-b-0">
                <div className="relative h-full">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-muted/50 to-transparent" />
                  <div className="relative h-full p-4">
                    <div className="h-full overflow-hidden rounded-lg border bg-background shadow-sm">
                      <BuilderPreview config={config} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Output */}
              <div className="overflow-hidden">
                <BuilderCodeOutput config={config} />
              </div>
            </div>
          ) : (
            /* Full Preview */
            <div className="relative flex-1">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-muted/50 to-transparent" />
              <div className="relative h-full p-4">
                <div className="h-full overflow-hidden rounded-lg border bg-background shadow-sm">
                  <BuilderPreview config={config} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
