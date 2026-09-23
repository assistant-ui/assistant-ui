import type { ReactNode } from "react";
import {
  CheckIcon,
  CircleIcon,
  HandIcon,
  LoaderIcon,
  MinusIcon,
  OctagonAlertIcon,
} from "lucide-react";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

/** A step's status, or "attention" when the next move is the user's. */
export type EntryStatus = Checkout.StepStatus | "attention";

export const STATUS_LABELS: Record<EntryStatus, string> = {
  pending: "pending",
  active: "in progress",
  done: "done",
  skipped: "skipped",
  blocked: "blocked",
  attention: "needs your input",
};

export function EntryIcon({ status }: { status: EntryStatus }) {
  const className = "size-4 shrink-0";
  switch (status) {
    case "done":
      return <CheckIcon className={className} />;
    case "active":
      return (
        <LoaderIcon
          aria-hidden
          className={cn(className, "text-foreground motion-safe:animate-spin")}
        />
      );
    case "attention":
      return <HandIcon className={cn(className, "text-foreground")} />;
    case "skipped":
      return <MinusIcon className={cn(className, "text-muted-foreground")} />;
    case "blocked":
      return <OctagonAlertIcon className={cn(className, "text-destructive")} />;
    default:
      return (
        <CircleIcon className="text-muted-foreground/50 size-3 shrink-0" />
      );
  }
}

export function TimelineEntry({
  status,
  current,
  title,
  detail,
  eyebrow,
  children,
}: {
  status: EntryStatus;
  current?: boolean;
  title: string;
  detail?: string | undefined;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  const pending = status === "pending";
  return (
    <li
      aria-current={current ? "step" : undefined}
      className="group relative flex gap-3"
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            status === "done"
              ? "bg-foreground text-background"
              : status === "active" || status === "attention"
                ? "bg-foreground/[0.04]"
                : "bg-foreground/[0.025]",
            status === "attention" && "bg-foreground/5",
          )}
        >
          <EntryIcon status={status} />
        </div>
        <div className="bg-foreground/10 my-1 w-px flex-1 group-last:hidden" />
      </div>
      <div className="min-w-0 flex-1 pt-1 pb-6 group-last:pb-0">
        {eyebrow}
        <p
          className={cn(
            "text-sm font-medium [overflow-wrap:anywhere]",
            status === "skipped" && "text-muted-foreground line-through",
            pending && "text-muted-foreground",
          )}
        >
          {title}
        </p>
        <span className="sr-only">{STATUS_LABELS[status]}</span>
        {detail ? (
          <p className="text-muted-foreground mt-1 text-sm [overflow-wrap:anywhere]">
            {detail}
          </p>
        ) : null}
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </li>
  );
}
