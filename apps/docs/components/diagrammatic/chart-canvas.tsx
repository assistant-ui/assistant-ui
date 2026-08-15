import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GRID_STYLE, canvasSurface } from "./styles";

/** The graph-paper plate every chart specimen sits on. */
export function ChartCanvas({
  children,
  className,
  chartClassName,
}: {
  children: ReactNode;
  className?: string;
  chartClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-2xl p-6",
        canvasSurface,
        className,
      )}
      style={GRID_STYLE}
    >
      <div className={cn("w-full", chartClassName)}>{children}</div>
    </div>
  );
}
