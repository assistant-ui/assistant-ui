import type { ReactNode } from "react";
import type { Checkout } from "@/lib/checkout/protocol";
import { TimelineEntry } from "./timeline";
import { setupStages } from "./setup-stages";

export function SetupProgress({
  state,
  ordered,
  buildSteps,
}: {
  state: Checkout.State | undefined;
  ordered: boolean;
  buildSteps?: ReactNode;
}) {
  return (
    <section aria-labelledby="setup-progress-heading" className="mt-8">
      <h2
        id="setup-progress-heading"
        className="mb-4 text-base font-medium sm:text-sm"
      >
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
