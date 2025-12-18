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
    <div className="flex h-full w-full gap-4 overflow-hidden bg-background p-4">
      <div className="w-72 shrink-0 overflow-hidden lg:w-80">
        <BuilderControls config={config} onChange={setConfig} />
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-4 overflow-hidden lg:grid-cols-2 lg:grid-rows-1">
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          <BuilderPreview config={config} />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <BuilderCodeOutput config={config} />
        </div>
      </div>
    </div>
  );
}
