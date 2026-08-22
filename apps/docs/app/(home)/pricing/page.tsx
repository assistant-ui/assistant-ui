import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { GitHubIcon } from "@/components/icons/github";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { CLOUD_URL } from "@/lib/constants";
import { PricingPlanCard } from "./pricing-plan-card";
import {
  cloudHighlights,
  faqs,
  libraryHighlights,
  pricingPlans,
} from "./pricing-data";

const title = "Pricing";
const description =
  "assistant-ui is free and open source. assistant-cloud is optional hosted persistence for threads, history, and auth.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

function HighlightGrid({ items }: { items: typeof libraryHighlights }) {
  return (
    <dl className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="flex flex-col gap-1.5">
          <dt className="text-[15px] font-medium">{item.title}</dt>
          <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
            {item.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function PricingPage() {
  return (
    <PageFrame pad="sub" className="flex flex-col gap-20 md:gap-28">
      <header className="max-w-2xl">
        <h1 className={typePage}>
          Open source UI. Hosted persistence when you need it.
        </h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          The library is free forever under MIT. assistant-cloud is an optional
          backend for threads, history, and auth if you do not want to run that
          yourself.
        </p>
      </header>

      <section className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className={typeSection}>The library</h2>
            <p className={typeDeck}>
              TypeScript and React for AI chat. Keep your backend. Customize
              every surface.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              nativeButton={false}
              render={<Link href="/docs/installation" />}
            >
              Read the docs
            </Button>
            <a
              href="https://github.com/assistant-ui/assistant-ui"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <GitHubIcon />
              GitHub
            </a>
          </div>
        </div>
        <HighlightGrid items={libraryHighlights} />
      </section>

      <section className="flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h2 className={typeSection}>assistant-cloud</h2>
          <p className={typeDeck}>
            Hosted thread persistence, history, and user-scoped storage. Use it
            with assistant-ui or your own UI.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PricingPlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          MAU means monthly active users who send at least one message. For
          consumer apps,{" "}
          <a
            href="mailto:b2c-pricing@assistant.dev"
            className="text-foreground/80 hover:text-foreground underline underline-offset-4"
          >
            write for B2C pricing
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h2 className={typeSection}>What Cloud includes</h2>
          <p className={typeDeck}>
            The same product on every plan. Higher tiers add volume, a custom
            backend, and an SLA.
          </p>
        </div>
        <HighlightGrid items={cloudHighlights} />
        <Link
          href="/docs/cloud"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Cloud persistence docs
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </section>

      <section className="flex flex-col gap-10">
        <h2 className={typeSection}>Questions</h2>
        <dl className="grid gap-10 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="flex flex-col gap-2">
              <dt className="text-[15px] font-medium">{faq.question}</dt>
              <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col items-start gap-6">
        <p className={typeSection}>Start with the library, add Cloud later.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button nativeButton={false} render={<Link href="/docs" />}>
            Get started
          </Button>
          <a
            href={CLOUD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            Open Cloud
          </a>
        </div>
      </section>
    </PageFrame>
  );
}
