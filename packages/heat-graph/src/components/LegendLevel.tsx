"use client";

import { type ComponentPropsWithoutRef, forwardRef, useMemo } from "react";
import { useLegendItemContext } from "../context";

export type LegendLevelProps = ComponentPropsWithoutRef<"div">;

export const LegendLevel = forwardRef<HTMLDivElement, LegendLevelProps>(
  ({ style, ...props }, ref) => {
    const { color } = useLegendItemContext();

    const mergedStyle = useMemo(
      () => ({ backgroundColor: color, ...style }),
      [color, style],
    );

    return <div ref={ref} style={mergedStyle} {...props} />;
  },
);

LegendLevel.displayName = "HeatGraph.LegendLevel";
