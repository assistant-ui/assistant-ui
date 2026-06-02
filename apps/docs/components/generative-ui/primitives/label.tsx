import { Label as UILabel } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SIZE, COLOR, WEIGHT, TEXT_ALIGN, cls, type Common } from "./tokens";

export function Label({
  value,
  fieldName,
  size = "sm",
  weight = "medium",
  color = "secondary",
  textAlign,
  children,
}: Common & {
  value?: string;
  fieldName?: string;
  size?: keyof typeof SIZE;
  weight?: keyof typeof WEIGHT;
  color?: keyof typeof COLOR;
  textAlign?: keyof typeof TEXT_ALIGN;
}) {
  return (
    <UILabel
      htmlFor={fieldName}
      className={cn(
        SIZE[size],
        cls(COLOR, color),
        cls(WEIGHT, weight),
        cls(TEXT_ALIGN, textAlign),
      )}
    >
      {value ?? children}
    </UILabel>
  );
}
