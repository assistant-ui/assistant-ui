"use client";

import { CopyButton } from "@/components/shared/copy-button";
import {
  LibraryShowcase,
  type SetupTab,
} from "@/components/pages/home/library-showcase";
import { TESTIMONIALS } from "@/components/pages/home/testimonials/data";
import { TrustedBy } from "@/components/pages/home/trusted-by";
import { Button } from "@/components/ui/button";
import {
  typeDeck,
  typeEyebrow,
  typePackage,
  typeSection,
} from "@/components/shared/type";
import { analytics } from "@/lib/analytics";
import Link from "next/link";

const CONTACT_SALES_URL = "https://cal.com/simon-farshid/assistant-ui";

const HOME_QUOTE_USERNAMES = [
  "@LangChainAI",
  "@neondatabase",
  "@hwchase17",
] as const;

const HOME_QUOTES = HOME_QUOTE_USERNAMES.flatMap((username) => {
  const quote = TESTIMONIALS.find((item) => item.username === username);
  return quote ? [quote] : [];
});

export function LibraryBody({
  setupTabs,
  reactVersion,
}: {
  setupTabs: SetupTab[];
  reactVersion: string | null;
}) {
  return (
    <div className="mt-16 flex flex-col gap-12 md:mt-20 md:gap-16">
      <section
        id="what-you-install"
        aria-labelledby="what-you-install-heading"
        className="flex scroll-mt-20 flex-col gap-8"
      >
        <div className="flex max-w-[40rem] flex-col gap-3">
          <p className={typeEyebrow}>What you install</p>
          <h2 id="what-you-install-heading" className={typePackage}>
            @assistant-ui/react
          </h2>
          <p className={typeDeck}>
            The runtime owns the thread, the stream, and the tools.
          </p>
        </div>

        <LibraryShowcase setupTabs={setupTabs} />
      </section>

      <section aria-label="Used by">
        <TrustedBy />
      </section>

      <section aria-label="Quotes">
        <ul className="grid gap-x-12 gap-y-8 md:grid-cols-3">
          {HOME_QUOTES.map((quote) => (
            <li key={quote.username}>
              <a
                href={quote.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2.5"
              >
                <p className="text-[14px] leading-relaxed text-pretty">
                  {quote.message}
                </p>
                <span className="text-muted-foreground group-hover:text-foreground text-xs font-medium transition-colors">
                  {quote.username}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-foreground/10 grid gap-6 border-t pt-10 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-12">
        <div className="flex flex-col gap-2.5">
          <p className={typeEyebrow}>Get started</p>
          <h2 className={typeSection}>Start in the docs.</h2>
          <p className="text-muted-foreground max-w-[36ch] text-[14px] leading-relaxed">
            The command scaffolds a working thread. The docs take it from there.
          </p>
        </div>

        <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex min-w-0 flex-col gap-7 px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[1.125rem] tracking-[-0.01em] break-all [font-variant-ligatures:none] md:text-[1.375rem]">
              npx assistant-ui init
            </p>
            <CopyButton text="npx assistant-ui init" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              nativeButton={false}
              render={
                <Link
                  href="/docs"
                  onClick={() =>
                    analytics.cta.clicked("get_started", "home_closer")
                  }
                />
              }
            >
              Read the docs
            </Button>
            <a
              href={CONTACT_SALES_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                analytics.cta.clicked("contact_sales", "home_closer")
              }
              className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
            >
              Contact sales
            </a>
          </div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-wide">
            {reactVersion
              ? `@assistant-ui/react@${reactVersion} · MIT License`
              : "@assistant-ui/react · MIT License"}
          </p>
        </div>
      </section>
    </div>
  );
}
