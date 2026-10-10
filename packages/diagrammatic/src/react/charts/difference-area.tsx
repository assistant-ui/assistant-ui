import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { type TickSpec, resolveTicks, upperBound } from "../../core/scale";
import type { Guide, Series } from "../../core/types";
import { bandPath, linePath, linear, round, stroke } from "../../core/geometry";
import { textWidth } from "../../core/text";
import { GRID, NEG, POS, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  Guides,
  PAD,
  SvgLegend,
  TickGrid,
  frame,
} from "../svg";

export type DifferenceAreaProps = BaseProps & {
  actual: Series;
  reference: Series;
  yTicks?: TickSpec;
  guides?: readonly Guide[];
  regions?: { from: number; to: number; label?: string }[];
};

export const DifferenceArea = forwardRef<SVGSVGElement, DifferenceAreaProps>(
  (
    {
      actual,
      reference,
      yTicks,
      guides,
      regions,
      format = formatCompact,
      labels,
      title,
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const max = upperBound([...actual.data, ...reference.data], yTicks, guides);
    const yTickList = resolveTicks(yTicks, 0, max, "linear", format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: true,
      labels: Boolean(labels),
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = linear(0, max, bottom, top);
    const count = Math.max(1, actual.data.length - 1);
    const X = (i: number) =>
      left + (Math.max(0, Math.min(count, i)) / count) * (right - left);
    const along = (values: number[]) =>
      values.map((value, i) => ({
        x:
          left +
          (values.length > 1 ? (i / (values.length - 1)) * (right - left) : 0),
        y: Y(value),
      }));
    const a = along(actual.data);
    const b = along(reference.data);
    const above = a.map((p, i) => ({ x: p.x, y: Math.min(p.y, b[i]!.y) }));
    const below = a.map((p, i) => ({ x: p.x, y: Math.max(p.y, b[i]!.y) }));
    const actualEnd = a[a.length - 1];
    const referenceEnd = b[b.length - 1];
    const actualLabel = format(actual.data[actual.data.length - 1] ?? 0);
    const referenceLabel = format(
      reference.data[reference.data.length - 1] ?? 0,
    );
    const endX = (label: string, point: { x: number } | undefined) =>
      point
        ? Math.min(point.x, F.width - PAD - textWidth(label, T.value.px) / 2)
        : 0;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <TickGrid
          ticks={yTickList}
          at={Y}
          from={left}
          to={right}
          type={T.axis}
        />
        {regions?.map((region) => (
          <g
            key={`${region.from}-${region.to}`}
            data-part="region"
            data-series={region.label}
          >
            <rect
              x={round(X(region.from))}
              y={top - 4}
              width={round(Math.max(0, X(region.to) - X(region.from)))}
              height={round(bottom - top + 4)}
              fill={ink(0.07)}
            />
            {region.label ? (
              <text
                x={round(X(region.from)) + 5}
                y={round(top + T.label.px - 2)}
                {...T.label.attrs}
              >
                {region.label}
              </text>
            ) : null}
          </g>
        ))}
        <Guides
          guides={guides}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <ColumnHits
          count={actual.data.length}
          x0={left}
          x1={right}
          top={top}
          bottom={bottom}
        />
        <path
          d={bandPath(above, b)}
          fill={POS}
          opacity="0.22"
          data-part="mark"
        />
        <path
          d={bandPath(b, below)}
          fill={NEG}
          opacity="0.22"
          data-part="mark"
        />
        <path
          d={linePath(b)}
          fill="none"
          stroke={ink(0.4)}
          strokeDasharray="4 4"
          data-part="mark"
          data-series={reference.name}
          {...stroke.hair}
        />
        <path
          d={linePath(a)}
          fill="none"
          stroke={ink(0.75)}
          data-part="mark"
          data-series={actual.name}
          {...stroke.line}
        />
        {actualEnd && (
          <text
            x={round(endX(actualLabel, actualEnd))}
            y={round(actualEnd.y - 7)}
            textAnchor="middle"
            {...T.value.attrs}
            fill={ink(0.75)}
          >
            {actualLabel}
          </text>
        )}
        {referenceEnd && (
          <text
            x={round(endX(referenceLabel, referenceEnd))}
            y={round(referenceEnd.y - 7)}
            textAnchor="middle"
            {...T.value.attrs}
            fill={ink(0.4)}
          >
            {referenceLabel}
          </text>
        )}
        <SvgLegend
          frame={F}
          names={[actual.name, reference.name, "ahead", "behind"]}
          colors={[ink(0.75), ink(0.4), POS, NEG]}
        />
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

DifferenceArea.displayName = "DifferenceArea";
