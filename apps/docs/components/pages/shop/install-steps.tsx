"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";
import { EntryIcon, STATUS_LABELS, type EntryStatus } from "./timeline";

function InstallStep({
  step,
  status,
  index,
  eyebrow,
}: {
  step: Checkout.Step;
  status: EntryStatus;
  index: number;
  eyebrow?: ReactNode;
}) {
  const [expanded, setExpanded] = useState<boolean>();
  const detail = step.note ?? step.detail;
  const open = expanded ?? (status === "blocked" || status === "attention");
  const label = (
    <>
      <span
        aria-hidden
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center"
      >
        {status === "pending" ? (
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {index + 1}
          </span>
        ) : (
          <EntryIcon status={status} />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left text-xs leading-5 [overflow-wrap:anywhere]">
        {step.title}
        <span className="sr-only">: {STATUS_LABELS[status]}</span>
      </span>
    </>
  );
  const rowClassName = cn(
    "flex min-h-9 w-full items-start gap-2.5 px-3 py-2 pointer-coarse:min-h-11",
    status === "pending" || status === "skipped"
      ? "text-muted-foreground"
      : "text-foreground",
    status === "active" && "bg-foreground/[0.04] font-medium",
  );

  return (
    <li className="border-foreground/10 border-b last:border-0">
      {eyebrow}
      {detail ? (
        <Collapsible open={open} onOpenChange={setExpanded}>
          <CollapsibleTrigger
            className={cn(
              rowClassName,
              "hover:bg-foreground/[0.04] focus-visible:ring-ring cursor-pointer rounded-none outline-none focus-visible:ring-2 focus-visible:ring-inset",
            )}
          >
            {label}
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "text-muted-foreground mt-1 size-3 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-muted-foreground px-3 pt-0.5 pb-2.5 text-xs leading-relaxed [overflow-wrap:anywhere]">
              {detail}
            </p>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className={rowClassName}>{label}</div>
      )}
    </li>
  );
}

export function InstallSteps({
  checkout,
  state,
}: {
  checkout: CheckoutContextValue;
  state: Checkout.State;
}) {
  const closed = state.status === "done" || state.status === "cancelled";
  const done = state.steps.filter((step) => step.status === "done").length;
  let lastProduct: string | undefined;

  return (
    <div className="min-w-0">
      <p className="text-muted-foreground mb-2 text-xs tabular-nums">
        {done} of {state.steps.length} completed
      </p>
      <ol
        role="list"
        aria-label="Installation steps"
        className="border-foreground/10 rounded-control overflow-hidden border"
      >
        {state.steps.map((step, index) => {
          const status: EntryStatus =
            !closed &&
            checkout.openInputs.some((input) => input.stepId === step.id)
              ? "attention"
              : step.status;
          const product =
            step.product !== undefined && step.product !== lastProduct
              ? state.products.find((entry) => entry.slug === step.product)
              : undefined;
          lastProduct = step.product ?? lastProduct;
          return (
            <InstallStep
              key={step.id}
              step={step}
              status={status}
              index={index}
              eyebrow={
                product && state.products.length > 1 ? (
                  <p className="text-muted-foreground px-3 pt-2.5 pb-1 text-[11px] leading-4">
                    {product.name}
                  </p>
                ) : undefined
              }
            />
          );
        })}
      </ol>
    </div>
  );
}
