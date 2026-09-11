"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typeEyebrow } from "@/components/shared/type";
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
        "rounded-document relative flex flex-col border-t pt-6",
        plan.highlighted ? "border-foreground" : "border-foreground/10",
      )}
    >
      <div className="mb-8">
        <h3 className={typeEyebrow}>{plan.name}</h3>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="font-display text-4xl font-[550] tracking-[-0.01em] tabular-nums">
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
