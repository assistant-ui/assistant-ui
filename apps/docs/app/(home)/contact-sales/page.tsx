import type { Metadata } from "next";
import Image from "next/image";
import { ContactSalesForm } from "@/components/pages/contact-sales/contact-sales-form";
import { CustomerLogos } from "@/components/pages/contact-sales/customer-logos";
import { TESTIMONIALS } from "@/components/pages/home/testimonials/data";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Contact sales";
const description =
  "Talk to the assistant-ui team about your chat UI, Assistant Cloud or enterprise terms.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const TOPICS = [
  {
    title: "Ship sooner",
    description:
      "Streaming, tool calls, attachments and auto-scroll work out of the box. Keep your own backend and models.",
  },
  {
    title: "Polished chat UI",
    description: "Accessible from day one. Styled to match your brand.",
  },
  {
    title: "Assistant Cloud",
    description:
      "We host thread history, titles and user auth. You pay per monthly active user.",
  },
  {
    title: "Enterprise",
    description:
      "Dedicated support, a 99.9% uptime SLA and custom pricing. Run it on your own servers. We help connect your backend.",
  },
];

const QUOTE = TESTIMONIALS.find((item) => item.username === "@neondatabase");

export default function ContactSalesPage() {
  return (
    <PageFrame pad="sub" className="flex flex-col gap-16 pb-16">
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2 lg:grid-rows-[auto_1fr] xl:gap-x-24">
        <header className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <h1 className={typePage}>Talk to the assistant-ui team</h1>
          <p className={cn(typeDeck, "max-w-[46ch]")}>
            Tell us what you're building. Then pick a time to talk.
          </p>
        </header>

        <section
          aria-label="Your details"
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <ContactSalesForm />
        </section>

        <dl className="flex flex-col gap-6 self-start lg:col-start-1 lg:row-start-2">
          {TOPICS.map((topic) => (
            <div key={topic.title} className="flex flex-col gap-1.5">
              <dt className="text-[15px] font-medium">{topic.title}</dt>
              <dd className="text-muted-foreground max-w-[52ch] text-sm leading-relaxed text-pretty">
                {topic.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <section
        aria-label="Customers"
        className="border-foreground/10 grid gap-x-16 gap-y-10 border-t pt-12 lg:grid-cols-2 xl:gap-x-24"
      >
        <div className="flex flex-col gap-6">
          <p className="text-muted-foreground text-xs font-medium">
            Used by teams at
          </p>
          <CustomerLogos />
        </div>

        {QUOTE ? (
          <figure className="flex flex-col gap-4">
            <blockquote className="max-w-[56ch] text-[15px] leading-relaxed text-pretty sm:[text-indent:-0.4em]">
              “{QUOTE.message}”
            </blockquote>
            <figcaption>
              <a
                href={QUOTE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 text-xs"
              >
                <Image
                  src={QUOTE.avatar}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-capsule ring-foreground/10 size-6 ring-1"
                />
                <span className="font-medium">Neon</span>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {QUOTE.username} on X
                </span>
              </a>
            </figcaption>
          </figure>
        ) : null}
      </section>
    </PageFrame>
  );
}
