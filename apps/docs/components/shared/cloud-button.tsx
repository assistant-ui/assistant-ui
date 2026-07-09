import { CLOUD_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const cloudButtonVariants = {
  marketing:
    "border-border hover:bg-muted hidden rounded-md border px-3 py-1.5 text-sm font-medium transition-colors md:inline-flex",
  docs: "border-border/50 bg-muted/50 hover:bg-muted flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors",
  mobile:
    "border-border hover:bg-muted inline-flex w-fit rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
};

export function CloudButton({
  variant,
  className,
  onClick,
}: {
  variant: keyof typeof cloudButtonVariants;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={CLOUD_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(cloudButtonVariants[variant], className)}
    >
      Cloud
    </a>
  );
}
