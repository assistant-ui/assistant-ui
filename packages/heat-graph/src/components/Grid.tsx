"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import { CellContext, useHeatGraphContext } from "../context";
import type { CellData } from "../types";

export type GridProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: (props: { cell: CellData }) => ReactNode;
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, style, ...props }, ref) => {
    const { totalWeeks, cells } = useHeatGraphContext();

    return (
      <div
        ref={ref}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`,
          gridTemplateRows: "repeat(7, 1fr)",
          ...style,
        }}
        {...props}
      >
        {cells.map((cell) => (
          <CellContext key={`${cell.column}-${cell.row}`} value={cell}>
            {children({ cell })}
          </CellContext>
        ))}
      </div>
    );
  },
);

Grid.displayName = "HeatGraph.Grid";
