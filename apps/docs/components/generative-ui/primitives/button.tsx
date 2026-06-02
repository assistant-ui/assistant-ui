import { Button as UIButton } from "@/components/ui/button";
import type { Common } from "./tokens";

export function Button({
  label,
  variant,
  size,
  block,
  onClick,
  children,
}: Common & {
  label?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  block?: boolean;
  onClick?: () => void;
}) {
  return (
    <UIButton
      variant={variant}
      size={size}
      onClick={onClick}
      className={block ? "w-full" : undefined}
    >
      {label ?? children}
    </UIButton>
  );
}
