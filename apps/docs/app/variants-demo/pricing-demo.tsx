"use client";

import { Variant, Variants } from "@assistant-ui/variants";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HEADLINE = "Simple pricing for growing teams.";
const DECK =
  "Start free, add seats as you grow. Every plan includes unlimited projects.";

const FEATURES = [
  "Unlimited projects",
  "Shared workspaces",
  "Usage analytics",
  "SSO and audit log",
  "Priority support",
] as const;

type Feature = (typeof FEATURES)[number];

const TIERS: {
  name: string;
  price: string;
  period: string;
  blurb: string;
  cta: string;
  featured: boolean;
  includes: readonly Feature[];
}[] = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    blurb: "For individuals trying things out.",
    cta: "Get started",
    featured: false,
    includes: ["Unlimited projects"],
  },
  {
    name: "Team",
    price: "$40",
    period: "per seat / month",
    blurb: "For teams shipping together.",
    cta: "Start a trial",
    featured: true,
    includes: ["Unlimited projects", "Shared workspaces", "Usage analytics"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "annual contract",
    blurb: "For organizations with security needs.",
    cta: "Contact sales",
    featured: false,
    includes: FEATURES,
  },
];

function Nav() {
  return (
    <header className="border-foreground/10 flex h-14 items-center justify-between border-b px-8">
      <div className="flex items-center gap-8">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="bg-foreground size-4 rounded-[5px]" aria-hidden />
          Lumen
        </span>
        <nav className="text-muted-foreground hidden gap-6 text-[13px] sm:flex">
          <span>Product</span>
          <span className="text-foreground">Pricing</span>
          <span>Changelog</span>
        </nav>
      </div>
      <Button type="button" variant="ghost" size="sm">
        Sign in
      </Button>
    </header>
  );
}

function HeadlineLeft() {
  return (
    <div className="flex max-w-[34rem] flex-col gap-3">
      <h1 className="font-display text-[2.25rem] leading-[1.1] font-medium tracking-[-0.015em] text-balance">
        {HEADLINE}
      </h1>
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        {DECK}
      </p>
    </div>
  );
}

function HeadlineCentered() {
  return (
    <div className="mx-auto flex max-w-[34rem] flex-col items-center gap-3 text-center">
      <p className="text-muted-foreground text-[13px] font-medium">Pricing</p>
      <h1 className="font-display text-[2.25rem] leading-[1.1] font-medium tracking-[-0.015em] text-balance">
        {HEADLINE}
      </h1>
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        {DECK}
      </p>
    </div>
  );
}

function PlanCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={cn(
            "flex flex-col gap-5 rounded-xl border p-5",
            tier.featured
              ? "border-foreground/30 bg-foreground/[0.03]"
              : "border-foreground/10",
          )}
        >
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-medium">{tier.name}</p>
            <p className="text-muted-foreground text-[13px]">{tier.blurb}</p>
          </div>
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-[1.75rem] font-medium tabular-nums">
              {tier.price}
            </span>
            <span className="text-muted-foreground text-xs">{tier.period}</span>
          </p>
          <ul className="flex flex-1 flex-col gap-2 text-[13px]">
            {tier.includes.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="text-muted-foreground size-3.5" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant={tier.featured ? "default" : "outline"}
            className="w-full"
          >
            {tier.cta}
          </Button>
        </div>
      ))}
    </div>
  );
}

function PlanTable() {
  return (
    <div className="border-foreground/10 overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[34rem] text-left text-[13px]">
        <thead>
          <tr className="border-foreground/10 border-b">
            <th className="w-[34%] p-4 font-normal" />
            {TIERS.map((tier) => (
              <th
                key={tier.name}
                className={cn(
                  "p-4 align-bottom font-normal",
                  tier.featured && "bg-foreground/[0.03]",
                )}
              >
                <p className="text-[14px] font-medium">{tier.name}</p>
                <p className="mt-1">
                  <span className="text-[18px] font-medium tabular-nums">
                    {tier.price}
                  </span>{" "}
                  <span className="text-muted-foreground text-xs">
                    {tier.period}
                  </span>
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature}>
              <td className="text-muted-foreground px-4 py-2.5">{feature}</td>
              {TIERS.map((tier) => (
                <td
                  key={tier.name}
                  className={cn(
                    "px-4 py-2.5",
                    tier.featured && "bg-foreground/[0.03]",
                  )}
                >
                  {tier.includes.includes(feature) ? (
                    <Check className="size-4" aria-label="Included" />
                  ) : (
                    <Minus
                      className="text-muted-foreground/40 size-4"
                      aria-label="Not included"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-4" />
            {TIERS.map((tier) => (
              <td
                key={tier.name}
                className={cn("p-4", tier.featured && "bg-foreground/[0.03]")}
              >
                <Button
                  type="button"
                  size="sm"
                  variant={tier.featured ? "default" : "outline"}
                >
                  {tier.cta}
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PlanFeatured() {
  const featured = TIERS.find((tier) => tier.featured)!;
  const others = TIERS.filter((tier) => !tier.featured);
  return (
    <div className="flex flex-col gap-4">
      <div className="border-foreground/30 bg-foreground/[0.03] grid gap-6 rounded-xl border p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-medium">
            {featured.name}{" "}
            <span className="text-muted-foreground font-normal">
              · {featured.blurb}
            </span>
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {featured.includes.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="text-muted-foreground size-3.5" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-5">
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-[2rem] font-medium tabular-nums">
              {featured.price}
            </span>
            <span className="text-muted-foreground text-xs">
              {featured.period}
            </span>
          </p>
          <Button type="button">{featured.cta}</Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {others.map((tier) => (
          <div
            key={tier.name}
            className="border-foreground/10 flex items-center justify-between gap-4 rounded-xl border px-5 py-4"
          >
            <div>
              <p className="text-[14px] font-medium">{tier.name}</p>
              <p className="text-muted-foreground text-[13px]">
                {tier.price} · {tier.period}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline">
              {tier.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingDemo() {
  return (
    <div className="flex flex-col">
      <Nav />
      <main className="mx-auto flex w-full max-w-[52rem] flex-col gap-12 px-8 py-14">
        <Variants
          id="variants-demo-headline"
          label="Headline"
          default="left"
          allowInProduction
        >
          <Variant id="left" label="Left aligned">
            <HeadlineLeft />
          </Variant>
          <Variant id="centered" label="Centered with eyebrow">
            <HeadlineCentered />
          </Variant>
        </Variants>

        <Variants
          id="variants-demo-plans"
          label="Plans"
          default="cards"
          allowInProduction
        >
          <Variant id="cards" label="Three cards">
            <PlanCards />
          </Variant>
          <Variant id="table" label="Comparison table">
            <PlanTable />
          </Variant>
          <Variant id="featured" label="One featured plan">
            <PlanFeatured />
          </Variant>
        </Variants>
      </main>
    </div>
  );
}
