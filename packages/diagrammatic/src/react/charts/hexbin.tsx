import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Pt, ScaleKind } from "../../core/types";
import {
  extent,
  hexPath,
  positiveExtent,
  project,
  round,
} from "../../core/geometry";
import { ACCENT, seqOpacity } from "../../core/theme";
import { hexbin } from "../../core/layout";
import { ChartSvg, PAD, frame } from "../svg";
import { textWidth, truncate } from "../../core/text";

export type HexbinProps = BaseProps & {
  points: Pt[];
  radius?: number;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  xLabel?: string;
  yLabel?: string;
};

export const Hexbin = forwardRef<SVGSVGElement, HexbinProps>(
  (
    {
      points,
      radius,
      xScale = "linear",
      yScale = "linear",
      xLabel,
      yLabel,
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
    const sizing = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: true,
      labels: Boolean(xLabel),
    });
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: true,
      labels: Boolean(xLabel),
      left: yLabel
        ? Math.max(sizing.left, PAD + sizing.T.axis.px + 6)
        : undefined,
    });
    const { left, right, top, bottom, axisY, legendY, T } = F;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [xLo, xHi] = xScale === "log" ? positiveExtent(xs) : extent(xs);
    const [yLo, yHi] = yScale === "log" ? positiveExtent(ys) : extent(ys);
    const plotW = right - left;
    const plotH = bottom - top;
    const binRadius =
      radius ?? Math.max(6, Math.min(28, Math.min(plotW, plotH) / 11));
    const X = project(xScale, xLo, xHi, binRadius, plotW - binRadius);
    const Y = project(yScale, yLo, yHi, plotH - binRadius, binRadius);
    const projected = points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    const bins = hexbin(projected, binRadius, plotW, plotH);
    const max = Math.max(...bins.map((b) => b.count), 1);
    const keyRadius = Math.max(3, Math.min(5, binRadius * 0.32));
    const keyStep = keyRadius * 2 + 6;
    const lowW = textWidth("low", T.axis.px);
    const highW = textWidth("high", T.axis.px);
    const keyWidth = lowW + highW + keyStep * 4 + 12;
    const keyLeft = Math.max(left, right - keyWidth);
    const swatchX = keyLeft + lowW + 6 + keyRadius;
    const highX = Math.min(right, swatchX + keyStep * 3 + keyRadius + 6);
    const yText = yLabel
      ? truncate(yLabel, T.axis.px, bottom - top)
      : undefined;
    const yLabelX = Math.max(PAD, T.axis.px / 2 + PAD);
    const yLabelY = (top + bottom) / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {bins.map((bin, i) => (
          <path
            key={i}
            d={hexPath(left + bin.cx, top + bin.cy, binRadius - 1)}
            fill={ACCENT}
            opacity={seqOpacity(bin.count / max)}
            data-part="mark"
            data-i={i}
          />
        ))}
        <g data-part="legend">
          {[0.15, 0.4, 0.7, 1].map((t, i) => (
            <path
              key={i}
              d={hexPath(
                swatchX + i * keyStep,
                legendY - T.axis.px * 0.35,
                keyRadius,
              )}
              fill={ACCENT}
              opacity={seqOpacity(t)}
            />
          ))}
          <text
            x={round(keyLeft)}
            y={legendY}
            textAnchor="end"
            {...T.axis.attrs}
          >
            low
          </text>
          <text x={round(highX)} y={legendY} {...T.axis.attrs}>
            high
          </text>
        </g>
        {yText ? (
          <text
            x={round(yLabelX)}
            y={round(yLabelY)}
            transform={`rotate(-90 ${round(yLabelX)} ${round(yLabelY)})`}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {yText}
          </text>
        ) : null}
        {xLabel ? (
          <text
            x={round((left + right) / 2)}
            y={axisY}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {truncate(xLabel, T.axis.px, right - left)}
          </text>
        ) : null}
      </ChartSvg>
    );
  },
);

Hexbin.displayName = "Hexbin";
