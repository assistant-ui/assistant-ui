import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, ScaleKind } from "../../core/types";
import { formatCompact } from "../../core/types";
import {
  type TickSpec,
  resolveTicks,
  tickValues,
  wantsTicks,
  upperBound,
} from "../../core/scale";
import {
  areaPath,
  linePath,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { truncate } from "../../core/text";
import { ACCENT, GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, Guides, TickGrid, frame } from "../svg";

export type HistogramProps = BaseProps & {
  bins: number[];
  compare?: readonly number[];
  marker?: { at: number; label?: string };
  smooth?: boolean;
  cumulative?: boolean;
  yScale?: ScaleKind;
  yTicks?: TickSpec;
  guides?: readonly Guide[];
};

export const Histogram = forwardRef<SVGSVGElement, HistogramProps>(
  (
    {
      bins,
      compare,
      marker,
      smooth,
      cumulative,
      yScale = "linear",
      yTicks,
      guides,
      labels,
      format = formatCompact,
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
    const running = (values: readonly number[]) => {
      const total = values.reduce((sum, v) => sum + v, 0) || 1;
      let acc = 0;
      return values.map((v) => {
        acc += v;
        return acc / total;
      });
    };
    const shown = cumulative ? running(bins) : bins;
    const shownCompare = compare
      ? cumulative
        ? running(compare)
        : compare
      : undefined;
    const yGuides = guides?.filter((g) => (g.axis ?? "y") === "y");
    const max = cumulative
      ? 1
      : upperBound([...shown, ...(shownCompare ?? [])], yTicks, yGuides);
    const yValues = [
      ...shown,
      ...(shownCompare ?? []),
      ...tickValues(yTicks),
      ...(yGuides?.map((g) => g.at) ?? []),
    ];
    const [yLo, yHi] = yScale === "log" ? positiveExtent(yValues) : [0, max];
    const yTickList = resolveTicks(yTicks, yLo, yHi, yScale, format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(labels),
      ticks: wantsTicks(yTicks) ? (yTickList ?? true) : false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = project(yScale, yLo, yHi, bottom, top);
    const span = right - left;
    const binWidth = span / Math.max(1, shown.length);
    const barGap = Math.min(4, binWidth * 0.2);
    const barWidth = Math.max(0, binWidth - barGap);
    const compareWidth = span / Math.max(1, shownCompare?.length ?? 0);
    const comparePath = shownCompare
      ? [
          `M${round(left)} ${round(bottom)}`,
          ...shownCompare.flatMap((value, i) => [
            `V${round(Y(value))}`,
            `H${round(left + (i + 1) * compareWidth)}`,
          ]),
          `V${round(bottom)}`,
        ].join(" ")
      : null;
    const curve = smooth
      ? shown.map((v, i) => ({
          x: left + (shown.length > 1 ? (i / (shown.length - 1)) * span : 0),
          y: Y(v),
        }))
      : null;
    const X = (i: number) => left + (i / Math.max(1, shown.length)) * span;
    const markerX = marker
      ? left + (marker.at / Math.max(1, bins.length)) * span
      : 0;
    const markerOnLeft = markerX > (left + right) / 2;
    const markerLabelX = Math.max(
      left,
      Math.min(right, markerOnLeft ? markerX - 6 : markerX + 6),
    );
    const markerLabelWidth = markerOnLeft
      ? markerLabelX - left
      : right - markerLabelX;
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
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
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
        {shown.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={round(left + i * binWidth)}
            y={top}
            width={round(binWidth)}
            height={bottom - top}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {curve ? (
          <>
            <path
              d={areaPath(curve, bottom)}
              fill={ink(0.1)}
              data-part="mark"
            />
            <path
              d={linePath(curve)}
              fill="none"
              stroke={ink(0.7)}
              data-part="mark"
              {...stroke.line}
            />
          </>
        ) : (
          shown.map((v, i) => (
            <rect
              key={i}
              x={round(left + i * binWidth + barGap / 2)}
              y={round(Y(v))}
              width={round(barWidth)}
              height={round(Math.max(0, bottom - Y(v)))}
              fill={ink(0.35)}
              data-part="mark"
              data-i={i}
            />
          ))
        )}
        {comparePath && (
          <path
            d={comparePath}
            stroke={ink(0.55)}
            {...stroke.line}
            strokeDasharray="3 2"
            fill="none"
            data-part="mark"
          />
        )}
        {marker && (
          <g>
            <line
              x1={markerX}
              y1={top}
              x2={markerX}
              y2={bottom}
              stroke={ACCENT}
              strokeDasharray="3 4"
              data-part="grid"
              {...stroke.hair}
            />
            {marker.label && (
              <text
                x={round(markerLabelX)}
                y={round(top + T.axis.px)}
                textAnchor={markerOnLeft ? "end" : undefined}
                {...T.axis.attrs}
                fill={ACCENT}
              >
                {truncate(marker.label, T.axis.px, markerLabelWidth)}
              </text>
            )}
          </g>
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) => left + (i * span) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Histogram.displayName = "Histogram";
