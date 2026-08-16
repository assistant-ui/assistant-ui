"use client";

import { type ReactNode, useState } from "react";
import { type MarkQuery, Root, Tooltip } from "diagrammatic/interactive";

type FigTooltipProps = {
  labels?: readonly string[];
  series?: Readonly<Record<string, readonly (number | string)[]>>;
  unit?: string;
  total?: boolean;
  children: ReactNode;
};

function markColor(element: Element, name: string): string | undefined {
  const svg = element.closest("svg");
  const mark = svg?.querySelector(`[data-series="${CSS.escape(name)}"]`);
  if (!mark) return undefined;
  const style = getComputedStyle(mark);
  return style.fill === "none" ? style.stroke : style.fill;
}

/**
 * Declarative tooltip skin over the package's interactive layer. Every prop
 * is serializable data, so RSC demo files can wrap a chart without owning
 * client code; the hovered mark's index and series key into `labels` and
 * `series`, and row swatches read their color from the live SVG.
 */
export function FigTooltip({
  labels,
  series,
  unit = "",
  total,
  children,
}: FigTooltipProps) {
  const [highlight, setHighlight] = useState<MarkQuery | null>(null);
  return (
    <Root
      highlight={highlight}
      onMarkHover={(datum) =>
        setHighlight(
          datum && datum.index !== undefined ? { index: datum.index } : null,
        )
      }
    >
      {children}
      <Tooltip side="top" sideOffset={12}>
        {({ datum }) => {
          const index = datum.index;
          const title = index === undefined ? undefined : labels?.[index];
          const rows =
            index === undefined
              ? []
              : Object.entries(series ?? {}).flatMap(([name, values]) => {
                  const value = values[index];
                  return value === undefined
                    ? []
                    : [{ name, value, color: markColor(datum.element, name) }];
                });
          const sum = rows.reduce(
            (acc, row) =>
              typeof row.value === "number" ? acc + row.value : acc,
            0,
          );
          if (!title && rows.length === 0 && !datum.series) return null;
          return (
            <div className="border border-white/10 bg-[#17181b]/95 px-2.5 py-2 font-[family-name:var(--font-mono)] text-[11px] leading-4 text-[#e8e9e4] shadow-lg">
              {title && (
                <p className="mb-1 text-[10px] tracking-[0.08em] text-[#e8e9e4]/55 uppercase">
                  {title}
                </p>
              )}
              {rows.length > 0 ? (
                <table className="border-separate border-spacing-0">
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.name}
                        className={
                          !datum.series || row.name === datum.series
                            ? "text-[#e8e9e4]"
                            : "text-[#e8e9e4]/55"
                        }
                      >
                        <td className="pr-1.5">
                          <span
                            className="inline-block size-2"
                            style={{ background: row.color }}
                          />
                        </td>
                        <td className="pr-3">{row.name}</td>
                        <td className="text-right tabular-nums">
                          {row.value}
                          {unit}
                        </td>
                      </tr>
                    ))}
                    {total && rows.length > 1 && (
                      <tr className="text-[#e8e9e4]">
                        <td />
                        <td className="pt-1 pr-3">total</td>
                        <td className="pt-1 text-right tabular-nums">
                          {sum}
                          {unit}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                datum.series && <p>{datum.series}</p>
              )}
            </div>
          );
        }}
      </Tooltip>
    </Root>
  );
}
