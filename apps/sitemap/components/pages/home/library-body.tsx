"use client";

import { HeroCta } from "@/components/pages/home/hero";
import {
  LibraryShowcase,
  type SetupTab,
} from "@/components/pages/home/library-showcase";
import { TESTIMONIALS } from "@/components/pages/home/testimonials/data";
import { TrustedBy } from "@/components/pages/home/trusted-by";
import { typeDeck, typePackage, typeSection } from "@/components/shared/type";
import Image from "next/image";

const HOME_QUOTE_USERNAMES = [
  "@LangChainAI",
  "@neondatabase",
  "@hwchase17",
] as const;

const HOME_QUOTES = HOME_QUOTE_USERNAMES.flatMap((username) => {
  const quote = TESTIMONIALS.find((item) => item.username === username);
  return quote ? [quote] : [];
});

export function LibraryBody({ setupTabs }: { setupTabs: SetupTab[] }) {
  return (
    <div className="mt-16 flex flex-col gap-12 md:mt-20 md:gap-16">
      <section
        id="what-you-install"
        aria-labelledby="what-you-install-heading"
        className="flex scroll-mt-20 flex-col gap-8"
      >
        <div className="flex max-w-[40rem] flex-col gap-3">
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
                <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-2 text-xs font-medium transition-colors">
                  <Image
                    src={quote.avatar}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-capsule size-5"
                  />
                  {quote.username}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-foreground/10 flex flex-col gap-6 border-t pt-10">
        <h2 className={typeSection}>Start building.</h2>
        <HeroCta section="home_closer" />
      </section>
    </div>
  );
}
