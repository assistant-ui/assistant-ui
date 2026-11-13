import type { Metadata } from "@farm.js/core";
import Image from "@farm.js/core/image";
import { ContactSalesForm } from "@/components/pages/contact-sales/contact-sales-form";
import { CustomerLogos } from "@/components/pages/contact-sales/customer-logos";
import { TESTIMONIALS } from "@/components/pages/home/testimonials/data";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Contact sales";
const description =
  "Talk to the assistant-ui team about shipping AI chat in production, scaling on Assistant Cloud, and enterprise terms.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const TOPICS = [
  {
    title: "Ship your AI product sooner",
    description:
      "Streaming, tool calls, attachments and auto-scroll are ready for production. Your engineers build what sets your product apart, on the backend and model stack you already run.",
  },
  {
    title: "A chat experience users trust",
    description:
      "Polished, accessible chat from your first release, styled to match your brand.",
  },
  {
    title: "Scale with Assistant Cloud",
    description:
      "Hosted thread history, titles and user auth, priced by monthly active users as you grow.",
  },
  {
    title: "Enterprise terms",
    description:
      "Dedicated support, a 99.9% uptime SLA, custom pricing, your own backend integration and on-premises deployment.",
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
            See how assistant-ui and Assistant Cloud fit your product, your
            stack and your requirements. Tell us about your team and we'll get
            you to the right people.
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
