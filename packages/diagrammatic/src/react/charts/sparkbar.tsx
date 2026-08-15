import type { BaseProps } from "../../core/types";
import { ACCENT, ink } from "../../core/theme";
import { MicroSvg } from "../svg";

export type SparkbarProps = Pick<BaseProps, "title" | "className"> & {
  data: number[];
};

/** Inline bar series; the peak reads in the accent. */
export function Sparkbar({ data, title, className }: SparkbarProps) {
  const max = Math.max(...data, 1);
  const step = 60 / Math.max(1, data.length);
  const width = Math.max(step * 0.66, 1);
  return (
    <MicroSvg vw={60} vh={20} em={1} title={title} className={className}>
      {data.map((v, i) => {
        const h = Math.max((v / max) * 16, 0.8);
        return (
          <rect
            key={i}
            x={step * i + (step - width) / 2}
            y={18 - h}
            width={width}
            height={h}
            rx={Math.min(1.2, width / 2)}
            fill={v === max ? ACCENT : ink(0.35)}
            data-part="mark"
            data-i={i}
          />
        );
      })}
    </MicroSvg>
  );
}
