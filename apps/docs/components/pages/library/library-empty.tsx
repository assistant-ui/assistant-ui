import type { ReactNode } from "react";
import { SearchXIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The panel a library list shows in place of its items when none match. */
export function LibraryEmpty({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}): ReactNode {
  return (
    <div
      className={cn(
        "bg-foreground/[0.03] dark:bg-foreground/[0.045] flex flex-col items-center rounded-[32px] px-6 py-16 text-center",
        className,
      )}
    >
      <span className="bg-background text-muted-foreground mb-4 grid size-11 place-items-center rounded-full">
        <SearchXIcon aria-hidden className="size-5" />
      </span>
      <h2 className="text-base font-medium text-balance">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm text-pretty">
          {description}
        </p>
      ) : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="bg-background hover:bg-foreground/[0.06] focus-visible:ring-ring mt-5 h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
