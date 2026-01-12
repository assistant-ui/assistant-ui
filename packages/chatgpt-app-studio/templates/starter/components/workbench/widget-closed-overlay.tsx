"use client";

import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw } from "lucide-react";

interface WidgetClosedOverlayProps {
  onReopen: () => void;
}

export function WidgetClosedOverlay({ onReopen }: WidgetClosedOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl bg-white/10 p-8 text-white">
        <XCircle className="h-12 w-12 opacity-60" />
        <div className="text-center">
          <div className="font-medium text-lg">Widget Closed</div>
          <div className="mt-1 text-sm opacity-70">
            The widget has been closed by the server or user request
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onReopen}
          className="mt-2 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reopen Widget
        </Button>
      </div>
    </div>
  );
}
