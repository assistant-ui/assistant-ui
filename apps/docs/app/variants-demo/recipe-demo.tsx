"use client";

import { Variant, Variants } from "@assistant-ui/variants";
import { Clock, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RECIPE = {
  title: "Weeknight lemon pasta",
  intro:
    "Bright, buttery, and on the table in twenty minutes. The pasta water does most of the work.",
  time: "20 min",
  serves: "Serves 2",
} as const;

const INGREDIENTS = [
  "200 g spaghetti",
  "2 tbsp butter",
  "1 lemon, zest and juice",
  "40 g parmesan, finely grated",
  "Black pepper",
  "A handful of basil",
] as const;

const STEPS = [
  "Boil the spaghetti in well-salted water until just shy of al dente.",
  "Melt the butter in a wide pan with the lemon zest over low heat.",
  "Move the pasta into the pan with a ladle of its cooking water.",
  "Toss in the parmesan and lemon juice until the sauce turns glossy.",
  "Finish with black pepper and torn basil, and serve right away.",
] as const;

const titleClass =
  "font-display text-[2.25rem] leading-[1.1] font-medium tracking-[-0.015em] text-balance";

function Nav() {
  return (
    <header className="border-foreground/10 flex h-14 items-center justify-between border-b px-8">
      <div className="flex items-center gap-8">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="bg-foreground rounded-capsule size-4" aria-hidden />
          Simmer
        </span>
        <nav className="text-muted-foreground hidden gap-6 text-[13px] sm:flex">
          <span className="text-foreground">Recipes</span>
          <span>Collections</span>
          <span>Kitchen notes</span>
        </nav>
      </div>
      <Button type="button" variant="ghost" size="sm">
        Sign in
      </Button>
    </header>
  );
}

function Meta({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-muted-foreground flex items-center gap-4 text-[13px]",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5" aria-hidden />
        {RECIPE.time}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5" aria-hidden />
        {RECIPE.serves}
      </span>
    </p>
  );
}

function HeaderLeft() {
  return (
    <div className="flex max-w-[34rem] flex-col gap-3">
      <h1 className={titleClass}>{RECIPE.title}</h1>
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        {RECIPE.intro}
      </p>
    </div>
  );
}

function HeaderCentered() {
  return (
    <div className="mx-auto flex max-w-[34rem] flex-col items-center gap-3 text-center">
      <Meta />
      <h1 className={titleClass}>{RECIPE.title}</h1>
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        {RECIPE.intro}
      </p>
    </div>
  );
}

function HeaderBanner() {
  return (
    <div className="bg-foreground/[0.03] dark:bg-foreground/[0.05] flex flex-col gap-4 rounded-xl px-8 py-10">
      <Meta />
      <h1 className={titleClass}>{RECIPE.title}</h1>
      <p className="text-muted-foreground max-w-[34rem] text-[15px] leading-relaxed">
        {RECIPE.intro}
      </p>
    </div>
  );
}

function HeaderSplit() {
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="flex flex-col gap-3">
        <h1 className={titleClass}>{RECIPE.title}</h1>
        <p className="text-muted-foreground max-w-[30rem] text-[15px] leading-relaxed">
          {RECIPE.intro}
        </p>
      </div>
      <dl className="flex gap-8">
        {[
          ["Time", RECIPE.time],
          ["Serves", "2"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-[13px]">{label}</dt>
            <dd className="font-display text-[1.5rem] leading-none font-medium tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function IngredientList() {
  return (
    <ul className="flex flex-col gap-2 text-[14px]">
      {INGREDIENTS.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function StepList() {
  return (
    <ol className="flex flex-col gap-3 text-[14px] leading-relaxed">
      {STEPS.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span className="text-muted-foreground tabular-nums">
            {index + 1}.
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function MethodSideBySide() {
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,14rem)_1fr]">
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-medium">Ingredients</h2>
        <IngredientList />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-medium">Method</h2>
        <StepList />
      </section>
    </div>
  );
}

function MethodStacked() {
  return (
    <div className="flex max-w-[40rem] flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="flex items-baseline gap-2 text-[15px] font-medium">
          Ingredients
          <span className="text-muted-foreground text-[13px] font-normal">
            {INGREDIENTS.length} items
          </span>
        </h2>
        <ul className="grid gap-x-8 gap-y-3 text-[14px] sm:grid-cols-2">
          {INGREDIENTS.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span
                aria-hidden
                className="border-foreground/25 size-4 shrink-0 rounded-[5px] border"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-[15px] font-medium">Method</h2>
        <ol className="flex flex-col gap-5">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span className="font-display text-foreground/25 w-7 shrink-0 text-[1.5rem] leading-none font-medium tabular-nums">
                {index + 1}
              </span>
              <p className="text-[14px] leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function MethodStepCards() {
  return (
    <div className="flex flex-col gap-6">
      <section className="bg-foreground/[0.03] dark:bg-foreground/[0.05] flex flex-col gap-3 rounded-xl p-5">
        <h2 className="text-[15px] font-medium">You&apos;ll need</h2>
        <ul className="grid gap-x-8 gap-y-2 text-[14px] sm:grid-cols-2">
          {INGREDIENTS.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="bg-foreground/30 rounded-capsule size-1.5 shrink-0"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <ol className="flex flex-col gap-2.5">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="bg-foreground/[0.03] dark:bg-foreground/[0.05] flex items-start gap-4 rounded-xl p-4"
          >
            <span className="bg-foreground text-background rounded-capsule grid size-7 shrink-0 place-items-center text-[13px] font-medium tabular-nums">
              {index + 1}
            </span>
            <p className="pt-0.5 text-[14px] leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MethodTimeline() {
  return (
    <div className="flex max-w-[40rem] flex-col gap-8">
      <p className="text-[14px] leading-relaxed">
        <span className="font-medium">You&apos;ll need </span>
        <span className="text-muted-foreground">
          {INGREDIENTS.join(", ").toLowerCase()}.
        </span>
      </p>
      <ol className="flex flex-col">
        {STEPS.map((step, index) => (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="bg-foreground/15 absolute top-4 bottom-0 left-[5px] w-px"
              />
            ) : null}
            <span
              aria-hidden
              className="border-foreground/40 bg-background rounded-capsule relative mt-1.5 size-[11px] shrink-0 border-2"
            />
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-[12px] tabular-nums">
                Step {index + 1}
              </span>
              <p className="text-[14px] leading-relaxed">{step}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MethodTabs() {
  const [tab, setTab] = useState<"ingredients" | "method">("ingredients");
  const tabs = [
    ["ingredients", "Ingredients", INGREDIENTS.length],
    ["method", "Method", STEPS.length],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label="Recipe section"
        className="border-foreground/10 flex gap-6 border-b"
      >
        {tabs.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "focus-visible:ring-ring -mb-px flex items-baseline gap-1.5 border-b-2 pb-3 text-[15px] font-medium transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none",
              tab === id
                ? "border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {label}
            <span className="text-muted-foreground text-[13px] font-normal tabular-nums">
              {count}
            </span>
          </button>
        ))}
      </div>
      {tab === "ingredients" ? (
        <ul className="grid gap-x-8 gap-y-3 text-[14px] sm:grid-cols-2 md:grid-cols-3">
          {INGREDIENTS.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span
                aria-hidden
                className="border-foreground/25 size-4 shrink-0 rounded-[5px] border"
              />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <StepList />
      )}
    </div>
  );
}

export function RecipeDemo() {
  return (
    <div className="flex flex-col">
      <Nav />
      <main className="mx-auto flex w-full max-w-[52rem] flex-col gap-12 px-8 py-14">
        <Variants
          id="variants-demo-header"
          label="Header"
          default="left"
          allowInProduction
        >
          <Variant id="left" label="Left aligned">
            <HeaderLeft />
          </Variant>
          <Variant id="centered" label="Centered with meta">
            <HeaderCentered />
          </Variant>
          <Variant id="banner" label="Banner">
            <HeaderBanner />
          </Variant>
          <Variant id="split" label="Split with stats">
            <HeaderSplit />
          </Variant>
        </Variants>

        <Variants
          id="variants-demo-method"
          label="Method"
          default="side-by-side"
          allowInProduction
        >
          <Variant id="side-by-side" label="Side by side">
            <MethodSideBySide />
          </Variant>
          <Variant id="stacked" label="Stacked">
            <MethodStacked />
          </Variant>
          <Variant id="cards" label="Step cards">
            <MethodStepCards />
          </Variant>
          <Variant id="timeline" label="Timeline">
            <MethodTimeline />
          </Variant>
          <Variant id="tabs" label="Tabs">
            <MethodTabs />
          </Variant>
        </Variants>
      </main>
    </div>
  );
}
