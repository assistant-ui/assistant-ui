"use client";

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

const ADAPTERS = [
  { label: "AI SDK", href: "/docs/runtimes/ai-sdk" },
  { label: "LangGraph", href: "/docs/runtimes/langgraph" },
  { label: "LangChain", href: "/docs/runtimes/langchain" },
] as const;

const PLATFORMS = [
  { label: "React", href: "/docs" },
  { label: "Native", href: "/native" },
  { label: "Ink", href: "/ink" },
] as const;

export function LibraryBody() {
  return (
    <div className="mt-16 flex flex-col gap-12 md:mt-20 md:gap-16">
      <section
        id="what-you-install"
        aria-labelledby="what-you-install-heading"
        className="flex max-w-[40rem] scroll-mt-20 flex-col gap-6"
      >
        <div className="flex flex-col gap-3">
          <p className={typeEyebrow}>What you install</p>
          <h2 id="what-you-install-heading" className={typePackage}>
            @assistant-ui/react
          </h2>
          <p className={typeDeck}>
            The runtime owns the thread, the stream, and the tools.
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {ADAPTERS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-[14px] font-medium transition-colors hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground text-[14px]">
          {PLATFORMS.map((item, index) => (
            <span key={item.href}>
              {index > 0 ? " · " : null}
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            </span>
          ))}
        </p>

        <div
          id="also-elements"
          className="flex max-w-[40ch] scroll-mt-20 flex-col gap-1.5 pt-2"
        >
          <h3 className="text-[15px] font-medium">
            <Link href="/elements" className="hover:underline">
              Elements
            </Link>
          </h3>
          <p className="text-muted-foreground text-[14px] leading-relaxed">
            Multimodal UI. An extension, not a replacement.
          </p>
        </div>
      </section>

      <section aria-label="Used by">
        <TrustedBy />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={typeSection}>Start in the docs.</h2>
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
      </section>
    </div>
  );
}
