import { cn } from "@/lib/utils";

export function XuluxPoweredBy({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-center text-[11px] text-muted-foreground/60 leading-4",
        className,
      )}
    >
      Powered by{" "}
      <a
        href="https://xulux.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-muted-foreground/75 transition-colors hover:text-foreground"
      >
        xulux.ai
      </a>
    </p>
  );
}
