import type { BaseProps, Item } from "../../core/types";
import { barPath } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { MicroSvg } from "../svg";

export type SplitBarProps = Pick<BaseProps, "title" | "className"> & {
  a: Item;
  b: Item;
};

/** Inline two way share: a in the accent, b in ink. */
export function SplitBar({ a, b, title, className }: SplitBarProps) {
  const total = a.value + b.value || 1;
  const w = (a.value / total) * 60;
  return (
    <MicroSvg vw={60} vh={20} em={1} title={title} className={className}>
      <path
        d={barPath(0, 6.5, Math.max(w - 0.7, 1), 7, 3.5, "left")}
        fill={ACCENT}
        opacity="0.85"
        data-part="mark"
        data-series={a.label}
      />
      <path
        d={barPath(
          Math.min(w + 0.7, 59),
          6.5,
          Math.max(60 - w - 0.7, 1),
          7,
          3.5,
          "right",
        )}
        fill={ink(0.2)}
        data-part="mark"
        data-series={b.label}
      />
    </MicroSvg>
  );
}
