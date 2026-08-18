"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import type { PricingPlan } from "./pricing-data";

export function PricingPlanCard({ plan }: { plan: PricingPlan }) {
  const handleClick = () => {
    const safePlanName = plan.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (plan.name === "Enterprise") {
      analytics.cta.clicked("contact_sales", "pricing");
    } else {
      analytics.cta.clicked("get_started", `pricing_${safePlanName}`);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl p-6 md:p-7",
        plan.highlighted ? "bg-muted" : "bg-muted/40",
      )}
    >
      <div className="mb-8">
        <h3 className="text-sm font-medium">{plan.name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-medium tracking-tight tabular-nums">
            {plan.price}
          </span>
          {plan.period && (
            <span className="text-muted-foreground text-sm">{plan.period}</span>
          )}
        </div>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
          {plan.description}
        </p>
      </div>

      <ul className="mb-8 flex flex-1 flex-col gap-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="text-muted-foreground flex items-start gap-2 text-sm leading-relaxed"
          >
            <Check className="text-foreground/50 mt-0.5 size-4 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        nativeButton={false}
        variant={plan.highlighted ? "default" : "outline"}
        className="w-full"
        render={
          <a
            href={plan.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
          />
        }
      >
        {plan.cta}
      </Button>
    </div>
  );
}
