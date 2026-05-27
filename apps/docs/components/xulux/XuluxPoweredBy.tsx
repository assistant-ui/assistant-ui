import { cn } from "@/lib/utils";

export function XuluxPoweredBy({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-muted-foreground/60 text-center text-[11px] leading-4",
        className,
      )}
    >
      Powered by{" "}
      <a
        href="https://xulux.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/75 hover:text-foreground font-medium transition-colors"
      >
        xulux.ai
      </a>
    </p>
  );
}
