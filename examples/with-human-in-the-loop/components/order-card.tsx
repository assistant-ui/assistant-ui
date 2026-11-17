"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  field,
  paper,
  ShimmerLabel,
} from "@/components/assistant-ui/elements/surfaces";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  isFailure,
  paymentLabel,
  type FindOrderResult,
} from "../lib/orders";

const day = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export const OrderCard: ToolCallMessagePartComponent<
  { orderId: string },
  FindOrderResult
> = ({ args, result, isError, status }) => {
  if (isError || status.type === "incomplete") {
    return (
      <p role="status" className="text-muted-foreground my-2 text-[13.5px]">
        The lookup for order {args.orderId} did not finish.
      </p>
    );
  }

  if (isFailure(result)) return null;

  if (!result) {
    return (
      <p className="my-2 text-[13.5px]">
        <ShimmerLabel className="text-muted-foreground">
          Looking up order {args.orderId}
        </ShimmerLabel>
      </p>
    );
  }

  const total = result.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  return (
    <section
      data-slot="order-card"
      aria-label={`Order ${result.id}`}
      className={cn(
        paper,
        "my-2 flex w-full max-w-sm flex-col gap-3 rounded-[20px] p-4 text-[13px]",
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <p className="text-[13.5px] font-medium">Order {result.id}</p>
          <p className="text-muted-foreground truncate text-xs">
            {result.customer} · placed{" "}
            {day.format(new Date(`${result.placedOn}T00:00:00Z`))}
          </p>
        </div>
        <p className="text-muted-foreground shrink-0 text-xs first-letter:uppercase">
          {result.status}
        </p>
      </header>

      <ul className={cn(field, "flex flex-col gap-2 rounded-xl px-3.5 py-2.5")}>
        {result.items.map((item) => (
          <li key={item.id} className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 break-words">
              {item.name}
              {item.quantity > 1 && (
                <span className="text-muted-foreground">
                  {" "}
                  × {item.quantity}
                </span>
              )}
            </span>
            <span className="text-foreground/80 tabular-nums">
              {formatMoney(item.quantity * item.unitPrice)}
            </span>
          </li>
        ))}
      </ul>

      <footer className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
        <span>{paymentLabel(result)}</span>
        <span>
          Total{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatMoney(total)}
          </span>
        </span>
      </footer>
    </section>
  );
};
