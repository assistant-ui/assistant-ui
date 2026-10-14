"use client";

import { CopyButton } from "@/components/shared/copy-button";
import {
  LibraryShowcase,
  type SetupTab,
} from "@/components/pages/home/library-showcase";
import { TESTIMONIALS } from "@/components/pages/home/testimonials/data";
import { TrustedBy } from "@/components/pages/home/trusted-by";
import { Button } from "@/components/ui/button";
import { typeDeck, typePackage, typeSection } from "@/components/shared/type";
import { analytics } from "@/lib/analytics";
import Image from "next/image";
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

      <section className="border-foreground/10 flex flex-col gap-10 border-t pt-10">
        <h2 className={typeSection}>Start in the docs.</h2>
        <ol className="grid gap-10 md:grid-cols-3 md:gap-12">
          <li className="flex flex-col gap-4">
            <p className="text-[15px] font-medium">
              Scaffold a thread.{" "}
              <span className="text-muted-foreground font-normal">
                The CLI copies the UI source into your project.
              </span>
            </p>
            <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex min-w-0 flex-wrap items-center gap-3 px-4 py-3">
              <p className="font-mono text-[14px] tracking-[-0.01em] break-all [font-variant-ligatures:none]">
                npx assistant-ui init
              </p>
              <CopyButton text="npx assistant-ui init" />
            </div>
            <p className="text-muted-foreground text-xs">
              <span className="font-mono">
                @assistant-ui/react
                {reactVersion && <span>@{reactVersion}</span>}
              </span>{" "}
              · MIT License
            </p>
          </li>
          <li className="flex flex-col gap-4">
            <p className="text-[15px] font-medium">
              Connect a backend.{" "}
              <span className="text-muted-foreground font-normal">
                Pick the runtime adapter for your stack.
              </span>
            </p>
            <div>
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
            </div>
          </li>
          <li className="flex flex-col gap-4">
            <p className="text-[15px] font-medium">
              Talk to the team.{" "}
              <span className="text-muted-foreground font-normal">
                Book a call about your deployment.
              </span>
            </p>
            <div>
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
          </li>
        </ol>
      </section>
    </div>
  );
}
