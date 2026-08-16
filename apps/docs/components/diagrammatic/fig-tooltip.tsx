"use client";

import type { ReactNode } from "react";
import { Root, Tooltip, getSeriesColor } from "diagrammatic/interactive";

type FigTooltipProps = {
  labels?: readonly string[];
  series?: Readonly<Record<string, readonly (number | string)[]>>;
  matrix?: {
    columns?: readonly string[];
    rows?: readonly string[];
    values: readonly (readonly (number | string)[])[];
  };
  entries?: Readonly<Record<string, number | string>>;
  unit?: string;
  total?: boolean;
  children: ReactNode;
};

/**
 * Declarative tooltip skin over the package's interactive layer. Every prop
 * is serializable data, so RSC demo files can wrap a chart without owning
 * client code; the hovered mark's index and series key into `labels` and
 * `series`, and row swatches read their color from the live SVG.
 */
export function FigTooltip({
  labels,
  series,
  matrix,
  entries,
  unit = "",
  total,
  children,
}: FigTooltipProps) {
  return (
    <Root highlightOnHover>
      {children}
      <Tooltip side="top" sideOffset={12}>
        {({ datum }) => {
          const index = datum.index;
          if (matrix && index !== undefined && datum.index2 !== undefined) {
            const cell = matrix.values[datum.index2]?.[index];
            if (cell === undefined) return null;
            const where = [
              matrix.rows?.[datum.index2],
              matrix.columns?.[index],
            ].filter(Boolean);
            return (
              <div className="border border-black/10 bg-white/98 px-2.5 py-2 font-[family-name:var(--font-mono)] text-[11px] leading-4 text-[#1a1b1e] shadow-md">
                {where.length > 0 && (
                  <p className="mb-0.5 text-[10px] tracking-[0.08em] text-[#1a1b1e]/50 uppercase">
                    {where.join(" · ")}
                  </p>
                )}
                <p className="text-right tabular-nums">
                  {cell}
                  {unit}
                </p>
              </div>
            );
          }
          if (datum.series !== undefined && (entries || datum.series2)) {
            const key = datum.series2
              ? `${datum.series} → ${datum.series2}`
              : datum.series;
            const value = entries?.[key];
            if (value !== undefined || datum.series2) {
              return (
                <div className="border border-black/10 bg-white/98 px-2.5 py-2 font-[family-name:var(--font-mono)] text-[11px] leading-4 text-[#1a1b1e] shadow-md">
                  <p className="flex items-baseline gap-3">
                    <span className="text-[#1a1b1e]/60">{key}</span>
                    {value !== undefined && (
                      <span className="ml-auto text-right tabular-nums">
                        {value}
                        {unit}
                      </span>
                    )}
                  </p>
                </div>
              );
            }
          }
          const title = index === undefined ? undefined : labels?.[index];
          const rows =
            index === undefined
              ? []
              : Object.entries(series ?? {}).flatMap(([name, values]) => {
                  const value = values[index];
                  return value === undefined
                    ? []
                    : [
                        {
                          name,
                          value,
                          color: getSeriesColor(datum.element, name),
                        },
                      ];
                });
          const sum = rows.reduce(
            (acc, row) =>
              typeof row.value === "number" ? acc + row.value : acc,
            0,
          );
          if (!title && rows.length === 0 && !datum.series) return null;
          return (
            <div className="border border-black/10 bg-white/98 px-2.5 py-2 font-[family-name:var(--font-mono)] text-[11px] leading-4 text-[#1a1b1e] shadow-md">
              {title && (
                <p className="mb-1 text-[10px] tracking-[0.08em] text-[#1a1b1e]/50 uppercase">
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
                            ? "text-[#1a1b1e]"
                            : "text-[#1a1b1e]/45"
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
                      <tr className="text-[#1a1b1e]">
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
