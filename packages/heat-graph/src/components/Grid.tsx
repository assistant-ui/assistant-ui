"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import { useHeatGraphContext } from "../context";
import { type CellCollection, useCells } from "../useCells";

export type GridProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: (props: { cells: CellCollection }) => ReactNode;
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, style, ...props }, ref) => {
    const { totalWeeks } = useHeatGraphContext();
    const cells = useCells();

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
        {children({ cells })}
      </div>
    );
  },
);

Grid.displayName = "HeatGraph.Grid";
