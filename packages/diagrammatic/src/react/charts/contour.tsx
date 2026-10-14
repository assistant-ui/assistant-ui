import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Pt, ScaleKind } from "../../core/types";
import {
  extent,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { ACCENT } from "../../core/theme";
import { densityEllipse } from "../../core/layout";
import { ChartSvg, PAD, frame } from "../svg";
import { truncate } from "../../core/text";

export type ContourProps = BaseProps & {
  points: Pt[];
  xLabel?: string;
  yLabel?: string;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
};

const LEVELS = [
  { sigma: 2.2, opacity: 0.25 },
  { sigma: 1.65, opacity: 0.4 },
  { sigma: 1.1, opacity: 0.6 },
  { sigma: 0.55, opacity: 0.85 },
];

function contourDomain(
  values: number[],
  scale: ScaleKind,
): [number, number, boolean] {
  const [lo, hi] = scale === "log" ? positiveExtent(values) : extent(values);
  const candidates = scale === "log" ? values.filter((v) => v > 0) : values;
  if (
    candidates.length === 0 ||
    candidates.some((value) => value !== candidates[0])
  )
    return [lo, hi, false];
  if (scale === "log") return [lo, hi, true];
  const pad = Math.abs(lo) || 1;
  return [lo - pad, hi + pad, true];
}

export const Contour = forwardRef<SVGSVGElement, ContourProps>(
  (
    {
      points,
      xLabel,
      yLabel,
      xScale = "linear",
      yScale = "linear",
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
      labels: Boolean(xLabel),
    });
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(xLabel),
      left: yLabel
        ? Math.max(sizing.left, PAD + sizing.T.axis.px + 6)
        : undefined,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [xLo, xHi, xDegenerate] = contourDomain(xs, xScale);
    const [yLo, yHi, yDegenerate] = contourDomain(ys, yScale);
    const X = project(xScale, xLo, xHi, left, right);
    const Y = project(yScale, yLo, yHi, bottom, top);
    const projected = points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    const rawEllipse = densityEllipse(projected);
    const ellipse = projected.length
      ? rawEllipse
      : {
          cx: (left + right) / 2,
          cy: (top + bottom) / 2,
          rx: 0,
          ry: 0,
          angle: 0,
        };
    const angle = (ellipse.angle * Math.PI) / 180;
    const outer = LEVELS[0]!.sigma;
    const halfW =
      outer *
      Math.sqrt(
        (ellipse.rx * Math.cos(angle)) ** 2 +
          (ellipse.ry * Math.sin(angle)) ** 2,
      );
    const halfH =
      outer *
      Math.sqrt(
        (ellipse.rx * Math.sin(angle)) ** 2 +
          (ellipse.ry * Math.cos(angle)) ** 2,
      );
    const fit = Math.min(
      1,
      halfW > 0 ? (ellipse.cx - left) / halfW : 1,
      halfW > 0 ? (right - ellipse.cx) / halfW : 1,
      halfH > 0 ? (ellipse.cy - top) / halfH : 1,
      halfH > 0 ? (bottom - ellipse.cy) / halfH : 1,
    );
    const minRadius = xDegenerate || yDegenerate ? 1 : 0;
    const rx = Math.max(ellipse.rx * Math.max(0, fit), minRadius);
    const ry = Math.max(ellipse.ry * Math.max(0, fit), minRadius);
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
        {LEVELS.map((level, i) => (
          <ellipse
            key={i}
            cx={round(ellipse.cx)}
            cy={round(ellipse.cy)}
            rx={round(rx * level.sigma)}
            ry={round(ry * level.sigma)}
            transform={`rotate(${round(ellipse.angle)} ${round(ellipse.cx)} ${round(ellipse.cy)})`}
            fill={ACCENT}
            fillOpacity="0.045"
            stroke={ACCENT}
            strokeOpacity={level.opacity}
            data-part="mark"
            data-i={i}
            {...stroke.medium}
          />
        ))}
        {yText && (
          <text
            x={round(yLabelX)}
            y={round(yLabelY)}
            transform={`rotate(-90 ${round(yLabelX)} ${round(yLabelY)})`}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {yText}
          </text>
        )}
        {xLabel && (
          <text
            x={round((left + right) / 2)}
            y={axisY}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {truncate(`${xLabel} →`, T.axis.px, right - left)}
          </text>
        )}
      </ChartSvg>
    );
  },
);

Contour.displayName = "Contour";
