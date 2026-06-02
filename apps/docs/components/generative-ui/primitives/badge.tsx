import { Badge as UIBadge } from "@/components/ui/badge";
import type { Common } from "./tokens";

export function Badge({
  value,
  variant,
  children,
}: Common & {
  value?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  return <UIBadge variant={variant}>{value ?? children}</UIBadge>;
}
