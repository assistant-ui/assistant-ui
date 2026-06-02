import { cn } from "@/lib/utils";
import { SIZE, COLOR, WEIGHT, TEXT_ALIGN, cls, type Common } from "./tokens";

export function Text({
  value,
  size = "md",
  color,
  weight,
  textAlign,
  children,
}: Common & {
  value?: string;
  size?: keyof typeof SIZE;
  color?: keyof typeof COLOR;
  weight?: keyof typeof WEIGHT;
  textAlign?: keyof typeof TEXT_ALIGN;
}) {
  return (
    <span
      className={cn(
        SIZE[size],
        cls(COLOR, color),
        cls(WEIGHT, weight),
        cls(TEXT_ALIGN, textAlign),
      )}
    >
      {value ?? children}
    </span>
  );
}
