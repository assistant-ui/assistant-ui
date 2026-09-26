import type { ReactNode } from "react";
import {
  CheckIcon,
  CircleDashedIcon,
  HandIcon,
  LoaderCircleIcon,
  MinusIcon,
  OctagonAlertIcon,
} from "lucide-react";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";
import { middleTruncate } from "./middle-truncate";

/** A step's status, "attention" when the next move is the user's, or "drafting" for the row the agent is still writing. */
export type EntryStatus = Checkout.StepStatus | "attention" | "drafting";

const DETAIL_CHARS = 140;

const ENTER =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out";
const LEAVE =
  "motion-safe:animate-out motion-safe:fade-out motion-safe:fill-mode-forwards motion-safe:duration-300 motion-safe:ease-out";

const STATUS_LABELS: Record<EntryStatus, string> = {
  pending: "pending",
  active: "in progress",
  done: "done",
  skipped: "skipped",
  blocked: "blocked",
  attention: "needs your input",
  drafting: "being written",
};

function EntryIcon({ status }: { status: EntryStatus }) {
  const className = "size-4 shrink-0";
  switch (status) {
    case "done":
      return <CheckIcon className={cn(className, "text-background")} />;
    case "active":
      return (
        <LoaderCircleIcon
          className={cn(className, "text-foreground animate-spin")}
        />
      );
    case "attention":
      return <HandIcon className={cn(className, "text-foreground")} />;
    case "skipped":
      return <MinusIcon className={cn(className, "text-muted-foreground")} />;
    case "blocked":
      return <OctagonAlertIcon className={cn(className, "text-destructive")} />;
    case "drafting":
      return (
        <CircleDashedIcon
          className={cn(
            className,
            "text-muted-foreground motion-safe:animate-[spin_3s_linear_infinite]",
          )}
        />
      );
    default:
      return (
        <CircleDashedIcon className={cn(className, "text-muted-foreground")} />
      );
  }
}

export function TimelineEntry({
  status,
  current,
  leaving,
  title,
  detail,
  eyebrow,
  children,
}: {
  status: EntryStatus;
  current?: boolean;
  /** Fades the row out; the caller unmounts it once the animation has run. */
  leaving?: boolean;
  title: string;
  detail?: string | undefined;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  const pending = status === "pending" || status === "drafting";
  return (
    <li
      aria-current={current ? "step" : undefined}
      aria-hidden={leaving ? true : undefined}
      className={cn(
        "group relative grid grid-rows-[1fr]",
        leaving ? "motion-safe:animate-fold" : "motion-safe:animate-unfold",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 gap-4 overflow-hidden",
          leaving ? LEAVE : ENTER,
        )}
      >
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border",
              status === "done"
                ? "bg-foreground border-foreground"
                : status === "active" || status === "attention"
                  ? "border-foreground"
                  : "border-foreground/10",
              status === "attention" && "bg-muted",
            )}
          >
            <EntryIcon status={status} />
          </div>
          <div className="bg-foreground/10 w-px flex-1 group-last:hidden" />
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
            <p
              title={detail}
              className="text-muted-foreground mt-1 line-clamp-2 text-sm [overflow-wrap:anywhere]"
            >
              {middleTruncate(detail, DETAIL_CHARS)}
            </p>
          ) : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </li>
  );
}
