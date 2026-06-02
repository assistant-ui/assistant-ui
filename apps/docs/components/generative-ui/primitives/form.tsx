import { cn } from "@/lib/utils";
import { ALIGN, JUSTIFY, cls, space, type Common } from "./tokens";

export function Form({
  gap,
  direction = "col",
  align,
  justify,
  padding,
  children,
}: Common & {
  gap?: number;
  direction?: "row" | "col";
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
  padding?: number;
}) {
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        cls(ALIGN, align),
        cls(JUSTIFY, justify),
      )}
      style={{ gap: space(gap), padding: space(padding) }}
    >
      {children}
    </form>
  );
}
