import type { CSSProperties } from "react";
import { space, type Common } from "./tokens";

export function Card({
  padding = 4,
  background,
  children,
}: Common & { padding?: number; background?: string }) {
  const style: CSSProperties = { padding: space(padding) };
  if (background) style.background = background;
  return (
    <div
      className="border-border/60 bg-card w-full rounded-xl border"
      style={style}
    >
      {children}
    </div>
  );
}
