import type { Metadata } from "next";
import Image from "next/image";
import { ContactSalesForm } from "@/components/pages/contact-sales/contact-sales-form";
import { CustomerLogos } from "@/components/pages/contact-sales/customer-logos";
import { TESTIMONIALS } from "@/components/pages/home/testimonials/data";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Talk to an expert";
const description =
  "Book a call with the assistant-ui team about your agent UI, Assistant Cloud, or an enterprise agreement.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const TOPICS = [
  {
    title: "Architecture review",
    description:
      "Walk through your backend, the runtime adapter that fits it, and how threads, tools and streaming map onto your product.",
  },
  {
    title: "Assistant Cloud",
    description:
      "Pricing, usage limits, and running the API and dashboard on your own infrastructure.",
  },
  {
    title: "Enterprise agreements",
    description:
      "Dedicated support, a 99.9% uptime SLA, custom terms, and on-premises deployment.",
  },
];

const QUOTE = TESTIMONIALS.find((item) => item.username === "@neondatabase");

export default function ContactSalesPage() {
  return (
    <PageFrame
      pad="sub"
      className="grid gap-x-20 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]"
    >
      <header className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <h1 className={typePage}>Talk to an expert</h1>
        <p className={cn(typeDeck, "max-w-[48ch]")}>
          Tell us what you are building, then pick a time for a 15 minute call
          with the team that maintains assistant-ui.
        </p>
      </header>

      <section
        aria-label="Your details"
        className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <ContactSalesForm />
      </section>

      <aside className="flex flex-col gap-12 lg:col-start-1 lg:row-start-2">
        <dl className="flex flex-col gap-6">
          {TOPICS.map((topic) => (
            <div key={topic.title} className="flex flex-col gap-1.5">
              <dt className="text-[15px] font-medium">{topic.title}</dt>
              <dd className="text-muted-foreground max-w-[52ch] text-sm leading-relaxed text-pretty">
                {topic.description}
              </dd>
            </div>
          ))}
        </dl>

        <div className="border-foreground/10 flex flex-col gap-6 border-t pt-8">
          <p className="text-muted-foreground text-xs font-medium">
            Used by teams at
          </p>
          <CustomerLogos />
        </div>

        {QUOTE ? (
          <figure className="flex max-w-[52ch] flex-col gap-3">
            <blockquote className="text-[15px] leading-relaxed text-pretty">
              {QUOTE.message}
            </blockquote>
            <figcaption>
              <a
                href={QUOTE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs font-medium transition-colors"
              >
                <Image
                  src={QUOTE.avatar}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-capsule size-5"
                />
                Neon, {QUOTE.username}
              </a>
            </figcaption>
          </figure>
        ) : null}
      </aside>
    </PageFrame>
  );
}
