"use client";

import { useState } from "react";

import type { BuilderConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { BuilderControls } from "./builder-controls";
import { BuilderPreview } from "./builder-preview";
import { BuilderCodeOutput } from "./builder-code-output";

export function Builder() {
  const [config, setConfig] = useState<BuilderConfig>(DEFAULT_CONFIG);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-xl border bg-background shadow-lg">
      {/* Controls Panel */}
      <div className="w-80 shrink-0 overflow-hidden border-r bg-background">
        <BuilderControls config={config} onChange={setConfig} />
      </div>

      {/* Preview & Code Panel */}
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
    </div>
  );
}
