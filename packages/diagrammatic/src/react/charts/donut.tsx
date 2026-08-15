import type { BaseProps, Item } from "../../core/types";
import { Pie } from "./pie";

export type DonutProps = BaseProps & {
  items: Item[];
  center?: string;
  centerLabel?: string;
};

export function Donut({ items, center, centerLabel, ...rest }: DonutProps) {
  return (
    <Pie
      items={items}
      inner={0.62}
      {...(center !== undefined ? { center } : {})}
      {...(centerLabel !== undefined ? { centerLabel } : {})}
      {...rest}
    />
  );
}
