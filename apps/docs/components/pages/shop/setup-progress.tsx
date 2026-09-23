import type { ReactNode } from "react";
import type { Checkout } from "@/lib/checkout/protocol";
import { TimelineEntry } from "./timeline";
import { setupStages } from "./setup-stages";
import { cn } from "@/lib/utils";

export function SetupProgress({
  state,
  ordered,
  buildSteps,
  className,
}: {
  state: Checkout.State | undefined;
  ordered: boolean;
  buildSteps?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label="Setup progress" className={cn("mt-8", className)}>
      <h2 className="text-muted-foreground mb-5 text-sm font-medium">
        Setup progress
      </h2>
      {state?.status === "cancelled" ? (
        <p className="text-muted-foreground mb-4 text-sm">Cancelled</p>
      ) : null}
      <ol role="list" aria-label="Setup progress" className="flex flex-col">
        {setupStages(state, ordered).map((stage) => (
          <TimelineEntry
            key={stage.id}
            status={stage.done ? "done" : stage.active ? "active" : "pending"}
            current={stage.active}
            title={stage.label}
            detail={
              stage.active
                ? {
                    order: "Choose your components",
                    connect: "Join from your coding agent",
                    plan: "Review before anything changes",
                    build: buildSteps ? undefined : "Follow the implementation",
                    complete: "Try it in your project",
                  }[stage.id]
                : undefined
            }
          >
            <span className="sr-only">
              {stage.done
                ? "Completed"
                : stage.active
                  ? "In progress"
                  : "Pending"}
            </span>
            {stage.id === "build" ? buildSteps : null}
          </TimelineEntry>
        ))}
      </ol>
    </section>
  );
}
