import type { CSSProperties } from "react";
import { RADIUS, space, type Common } from "./tokens";

export function Box({
  width,
  height,
  radius,
  background,
  padding,
  children,
}: Common & {
  width?: number | string;
  height?: number | string;
  radius?: number | keyof typeof RADIUS;
  background?: string;
  padding?: number;
}) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;
  if (padding !== undefined) style.padding = space(padding);
  if (radius !== undefined)
    style.borderRadius = typeof radius === "number" ? radius : RADIUS[radius];
  if (background)
    style.background = background === "white" ? "#ffffff" : background;
  return <div style={style}>{children}</div>;
}
