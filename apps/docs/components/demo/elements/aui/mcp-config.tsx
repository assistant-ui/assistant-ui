"use client";

import { PlugIcon, PlusIcon } from "lucide-react";
import { DemoSurface } from "./surface";

export function AuiMcpConfigDemo() {
  return (
    <DemoSurface>
      <div className="bg-background w-full max-w-lg rounded-2xl border p-5 shadow-sm">
        <div>
          <h4 className="text-sm font-semibold">MCP servers</h4>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Connect servers to expose their tools to this assistant.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium">Connectors</p>
            <div className="text-muted-foreground mt-2 flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs">
              <PlugIcon className="size-3.5" />
              No connectors configured
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium">Custom servers</p>
              <button
                type="button"
                className="hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Add server
              </button>
            </div>
          </div>
        </div>
      </div>
    </DemoSurface>
  );
}
