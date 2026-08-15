import { forwardRef } from "react";
import type { Item } from "../../core/types";
import type { BaseProps } from "../svg";
import { Pie } from "./pie";

export type DonutProps = BaseProps & {
  items: Item[];
  center?: string;
  centerLabel?: string;
};

export const Donut = forwardRef<SVGSVGElement, DonutProps>(
  ({ items, center, centerLabel, ...rest }, ref) => {
    return (
      <Pie
        ref={ref}
        items={items}
        inner={0.62}
        {...(center !== undefined ? { center } : {})}
        {...(centerLabel !== undefined ? { centerLabel } : {})}
        {...rest}
      />
    );
  },
);

Donut.displayName = "Donut";
