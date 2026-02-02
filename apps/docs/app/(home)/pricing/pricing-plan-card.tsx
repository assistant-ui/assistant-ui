"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

export function PricingPlanCard({ plan }: { plan: PricingPlan }) {
  const handleClick = () => {
    // Track pricing plan clicks with plan name for attribution
    if (plan.name === "Enterprise") {
      analytics.cta.clicked("contact_sales", "pricing");
    } else {
      analytics.cta.clicked(
        "get_started",
        `pricing_${plan.name.toLowerCase()}`,
      );
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border p-6",
        plan.highlighted ? "border-foreground/20 bg-muted/30" : "border-border",
      )}
    >
      <div className="mb-6">
        <h3 className="font-medium text-sm">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-medium text-2xl tracking-tight">
            {plan.price}
          </span>
          {plan.period && (
            <span className="text-muted-foreground text-sm">{plan.period}</span>
          )}
        </div>
        <p className="mt-1 text-muted-foreground text-sm">{plan.description}</p>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-muted-foreground text-sm"
          >
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-foreground/60" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        onClick={handleClick}
        className={cn(
          "block rounded-md py-2 text-center font-medium text-sm transition-colors",
          plan.highlighted
            ? "bg-foreground text-background hover:bg-foreground/90"
            : "border border-border hover:bg-muted",
        )}
      >
        {plan.cta}
      </Link>
    </div>
  );
}
