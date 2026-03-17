"use client";

import * as Popper from "@radix-ui/react-popper";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
} from "react";
import { useTooltipState } from "../context";
import type { CellData } from "../types";

type PopperContentProps = ComponentPropsWithoutRef<typeof Popper.Content>;

export type TooltipProps = Omit<PopperContentProps, "children"> & {
  children: (props: { cell: CellData }) => ReactNode;
};

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ children, side = "top", sideOffset = 8, ...props }, ref) => {
    const state = useTooltipState();
    if (!state?.hoveredCell || !state.anchor) return null;

    return (
      <Popper.Root>
        <Popper.Anchor virtualRef={{ current: state.anchor }} />
        <Popper.Content
          ref={ref}
          side={side}
          sideOffset={sideOffset}
          {...props}
        >
          {children({ cell: state.hoveredCell })}
        </Popper.Content>
      </Popper.Root>
    );
  },
);

Tooltip.displayName = "HeatGraph.Tooltip";
