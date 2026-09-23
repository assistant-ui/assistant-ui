"use client";

import { useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SetupComposer } from "@/components/pages/shop/setup-composer";
import { useAgentName } from "@/components/pages/shop/agent-status";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

/** The checkout worker (harness-sdk, apps/checkout-worker host) logs "Completed: <title>" or "Skipped: <title>" with the stepId when a step closes; the step list already shows them. */
const isStepLine = (entry: Checkout.LogEntry, state: Checkout.State) =>
  entry.role === "agent" &&
  entry.stepId !== undefined &&
  state.steps.some((step) =>
    ["Completed", "Skipped"].some(
      (verb) =>
        entry.text === `${verb}: ${step.title}` ||
        entry.text.startsWith(`${verb}: ${step.title}\n\n`),
    ),
  );

/** What the user and the agent said to each other, in order. */
export const conversation = (state: Checkout.State | undefined) =>
  state === undefined
    ? []
    : state.log.filter((entry) => !isStepLine(entry, state));

export function AgentChat({
  checkout,
  open,
  onOpenChange,
}: {
  checkout: CheckoutContextValue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const name = useAgentName(checkout);
  const entries = conversation(checkout.state);
  const list = useRef<HTMLOListElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const last = entries.at(-1)?.id;
  useEffect(() => {
    if (!open || last === undefined) return;
    list.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [open, last]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent initialFocus={composer} className="gap-0 p-0">
        <SheetHeader className="border-foreground/10 border-b pr-12">
          <SheetTitle>Messages</SheetTitle>
          <SheetDescription>
            Send {name} a note at any time. Its replies land here.
          </SheetDescription>
        </SheetHeader>
        {entries.length === 0 ? (
          <p className="text-muted-foreground flex-1 px-4 py-6 text-sm">
            No messages yet.
          </p>
        ) : (
          <ol
            ref={list}
            role="log"
            aria-label="Messages"
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  "flex flex-col gap-1",
                  entry.role === "user" ? "items-end" : "items-start",
                )}
              >
                <span className="sr-only">
                  {entry.role === "user" ? "You: " : `${name}: `}
                </span>
                <span
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap",
                    entry.role === "user"
                      ? "bg-foreground text-background rounded-br-md"
                      : "bg-foreground/[0.06] rounded-bl-md",
                  )}
                >
                  {entry.text}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="border-foreground/10 shrink-0 border-t p-3">
          <SetupComposer checkout={checkout} ref={composer} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
