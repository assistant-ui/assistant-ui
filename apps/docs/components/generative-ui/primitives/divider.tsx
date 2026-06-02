import { cn } from "@/lib/utils";

export function Divider({
  flush,
  tone = "default",
}: {
  flush?: boolean;
  tone?: "default" | "light";
}) {
  return (
    <hr
      className={cn(
        tone === "light" ? "border-white/20" : "border-border/60",
        flush ? "-mx-4" : "",
      )}
    />
  );
}
