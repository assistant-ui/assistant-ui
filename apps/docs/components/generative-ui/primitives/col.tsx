import { cn } from "@/lib/utils";
import { ALIGN, JUSTIFY, cls, space, type Common } from "./tokens";

export function Col({
  gap,
  align,
  justify,
  children,
}: Common & {
  gap?: number;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
}) {
  return (
    <div
      className={cn("flex flex-col", cls(ALIGN, align), cls(JUSTIFY, justify))}
      style={{ gap: space(gap) }}
    >
      {children}
    </div>
  );
}
