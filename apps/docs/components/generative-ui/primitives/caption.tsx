import { cn } from "@/lib/utils";
import { COLOR, cls, type Common } from "./tokens";

export function Caption({
  value,
  color = "secondary",
  children,
}: Common & { value?: string; color?: keyof typeof COLOR }) {
  return (
    <span className={cn("text-xs", cls(COLOR, color))}>
      {value ?? children}
    </span>
  );
}
