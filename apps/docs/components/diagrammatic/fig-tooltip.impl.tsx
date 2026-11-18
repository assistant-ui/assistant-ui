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
  solo?: boolean;
  highlight?: "index" | "series";
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
  solo,
  highlight,
  unit = "",
  total,
  children,
}: FigTooltipProps) {
  return (
    <Root highlightOnHover={highlight ?? true}>
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
              <Tip>
                {where.length > 0 && <Head>{where.join(" · ")}</Head>}
                <span className="tabular-nums">
                  {cell}
                  {unit}
                </span>
              </Tip>
            );
          }
          if (datum.series !== undefined && (entries || datum.series2)) {
            const key = datum.series2
              ? `${datum.series} → ${datum.series2}`
              : datum.series;
            const value = entries?.[key];
            if (value !== undefined || datum.series2) {
              return (
                <Tip>
                  <Row
                    name={key}
                    {...(value !== undefined
                      ? {
                          value: (
                            <>
                              {value}
                              {unit}
                            </>
                          ),
                        }
                      : {})}
                  />
                </Tip>
              );
            }
          }
          const title = index === undefined ? undefined : labels?.[index];
          const rows =
            index === undefined
              ? []
              : Object.entries(series ?? {}).flatMap(([name, values]) => {
                  if (solo && name !== datum.series) return [];
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
            <Tip>
              {title && <Head>{title}</Head>}
              {rows.length === 1 && title ? (
                <span className="tabular-nums">
                  {rows[0]!.value}
                  {unit}
                </span>
              ) : rows.length > 0 ? (
                <div className="flex flex-col gap-px">
                  {rows.map((row) => (
                    <Row
                      key={row.name}
                      name={row.name}
                      value={
                        <>
                          {row.value}
                          {unit}
                        </>
                      }
                      {...(row.color ? { color: row.color } : {})}
                      dim={!!datum.series && row.name !== datum.series}
                    />
                  ))}
                  {total && rows.length > 1 && (
                    <div className="mt-0.5 border-t border-black/10 pt-1">
                      <Row
                        name="total"
                        pad
                        value={
                          <>
                            {sum}
                            {unit}
                          </>
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                datum.series && <p>{datum.series}</p>
              )}
            </Tip>
          );
        }}
      </Tooltip>
    </Root>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose w-max border border-black/10 bg-white/98 px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px]/[14px] text-[#1a1b1e] shadow-md">
      {children}
    </div>
  );
}

function Head({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[10px]/[12px] text-[#1a1b1e]/45">{children}</p>
  );
}

function Row({
  name,
  value,
  color,
  dim,
  pad,
}: {
  name: ReactNode;
  value?: ReactNode;
  color?: string;
  dim?: boolean;
  pad?: boolean;
}) {
  return (
    <div
      className={
        dim
          ? "flex items-baseline gap-1.5 text-[#1a1b1e]/45"
          : "flex items-baseline gap-1.5"
      }
    >
      {color ? (
        <span
          className="inline-block size-1.5 shrink-0 self-center"
          style={{ background: color }}
        />
      ) : pad ? (
        <span className="inline-block size-1.5 shrink-0" />
      ) : null}
      <span>{name}</span>
      {value !== undefined ? (
        <span className="tabular-nums">{value}</span>
      ) : null}
    </div>
  );
}
