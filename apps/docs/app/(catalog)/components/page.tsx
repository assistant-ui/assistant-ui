import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { DemoCard } from "@/components/pages/elements/demo-card";
import { getElement } from "@/components/pages/elements/registry";
import { AddToCartButton } from "@/components/pages/shop/add-to-cart-button";
import { NavGlyph } from "@/components/shared/nav-glyph";
import { PageFrame } from "@/components/shared/page-frame";
import { StartSetupDialog } from "@/components/shared/start-setup-dialog";
import { typeDeck, typeSection } from "@/components/shared/type";
import { formatMinutes, getCatalogItem, type CatalogItem } from "@/lib/catalog";
import { assistantUi } from "@/lib/catalog/products/assistant-ui";
import { ELEMENT_PRODUCTS } from "@/lib/catalog/products/elements";
import { cloud } from "@/lib/catalog/products/cloud";
import { agentTools } from "@/lib/catalog/products/agent-tools";
import { GUIDE_PRODUCTS } from "@/lib/catalog/products/guides";
import { checkoutEnabled } from "@/lib/checkout/config";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Components";
const description = "Everything you can add to an assistant-ui project.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const BACKEND_GUIDES = new Set([
  "guides/resumable-streams",
  "guides/langfuse",
  "guides/langsmith",
]);

const AGENT_GUIDES = new Set([
  "guides/mcp",
  "guides/user-managed-mcp",
  "guides/devtools",
]);

const elements = (slugs: readonly string[]): CatalogItem[] =>
  slugs.flatMap((slug) => {
    const item = getCatalogItem(`elements/${slug}`);
    const element = getElement(slug);
    return item && element
      ? [{ ...item, preview: slug, tagline: element.description }]
      : [];
  });

const SECTIONS = [
  {
    id: "chat-ui",
    title: "Chat UI",
    description:
      "A streaming chat interface, with attachments, voice, and message controls.",
    items: GUIDE_PRODUCTS.filter(
      (item) => !BACKEND_GUIDES.has(item.slug) && !AGENT_GUIDES.has(item.slug),
    ),
  },
  {
    id: "take-actions",
    title: "Take actions",
    description:
      "Collect user input and approvals, and let agents read and update your application.",
    items: elements(["approval-card", "elicitation-form", "option-list"]),
    guide: {
      href: "/docs/tools/interactables",
      label: "Connect agents to your app with interactables",
    },
  },
  {
    id: "data-vis-generative-ui",
    title: "Data visualization and generative UI",
    description:
      "Present answers as charts and tables, or let the model compose an interface from your components.",
    items: elements(["chart", "data-table", "generative-ui"]),
    guide: { href: "/docs/tools/generative-ui", label: "Build generative UI" },
  },
  {
    id: "backend",
    title: "Backend",
    description:
      "Save conversations, resume interrupted streams, and trace model calls.",
    items: [
      cloud,
      ...GUIDE_PRODUCTS.filter((item) => BACKEND_GUIDES.has(item.slug)),
    ],
  },
  {
    id: "agent-tools",
    title: "Agent tools",
    description:
      "Define tools for your agents, connect MCP servers, and inspect the runtime.",
    items: [
      agentTools,
      ...GUIDE_PRODUCTS.filter((item) => AGENT_GUIDES.has(item.slug)),
    ],
  },
];

const BUNDLE = (assistantUi.bundle ?? []).flatMap((slug) => {
  const element = getElement(slug);
  return element ? [element] : [];
});

const navLink =
  "group/navlink inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline";

const navArrow =
  "size-3.5 transition-[translate] group-hover/navlink:translate-x-0.5 motion-reduce:transition-none";

export default function ShopPage() {
  if (!checkoutEnabled) notFound();
  return (
    <PageFrame pad="sub">
      <h1 className="sr-only">Components</h1>

      <nav
        aria-label="Component sections"
        className="mb-12 flex flex-wrap gap-x-6 gap-y-3"
      >
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`} className={navLink}>
            {section.title}
          </a>
        ))}
      </nav>

      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-heading`}
          className="border-foreground/10 mb-16 scroll-mt-24 border-t pt-10"
        >
          <h2 id={`${section.id}-heading`} className={typeSection}>
            {section.title}
          </h2>
          <p className={cn("mt-3", typeDeck)}>{section.description}</p>
          {section.guide ? (
            <Link href={section.guide.href} className={cn("mt-4", navLink)}>
              {section.guide.label}
              <ArrowRightIcon aria-hidden className={navArrow} />
            </Link>
          ) : null}
          {section.id === "chat-ui" ? (
            <section
              aria-labelledby="starter-heading"
              className="mt-10 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
            >
              <div className="group/navlink">
                <NavGlyph kind={assistantUi.glyph} />
                <h3 id="starter-heading" className={cn("mt-6", typeSection)}>
                  Chat Starter
                </h3>
                <p className={cn("mt-3", typeDeck)}>{assistantUi.tagline}</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  For {assistantUi.audience}. Agent time{" "}
                  {formatMinutes(assistantUi.agentMinutes)}.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <StartSetupDialog location="shop_featured">
                    Start setup
                  </StartSetupDialog>
                  <Link href={assistantUi.href} className={navLink}>
                    See what it installs
                    <ArrowRightIcon aria-hidden className={navArrow} />
                  </Link>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium">Works out of the box</h4>
                <ul role="list" className="mt-4 gap-x-10 sm:columns-2">
                  {assistantUi.features?.map((feature) => (
                    <li
                      key={feature}
                      className="text-foreground/90 flex break-inside-avoid gap-2.5 pb-2.5 text-[0.9375rem] leading-relaxed text-pretty"
                    >
                      <span
                        aria-hidden
                        className="bg-foreground/30 mt-[0.65em] size-1 shrink-0 rounded-full"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <h4 className="mt-8 text-sm font-medium">In the bundle</h4>
                <ul role="list" className="mt-4 flex flex-wrap gap-2">
                  {BUNDLE.map((element) => (
                    <li key={element.slug}>
                      <Link
                        href={`/elements/${element.slug}`}
                        className="border-foreground/10 hover:border-foreground/30 inline-flex rounded-sm border px-2.5 py-1 text-[0.8125rem] transition-colors"
                      >
                        {element.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
          <ul
            role="list"
            className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3"
          >
            {section.items.flatMap((item) => {
              const element = item.preview
                ? getElement(item.preview)
                : undefined;
              return element
                ? [
                    <li
                      key={item.slug}
                      className={cn(
                        element.wide && "md:col-span-2 xl:col-span-3",
                      )}
                    >
                      <DemoCard
                        href={item.href}
                        {...(element.wide ? { wide: true } : {})}
                        title={item.name}
                        description={item.tagline}
                        action={
                          <AddToCartButton
                            slug={item.slug}
                            name={item.name}
                            variant="outline"
                          />
                        }
                      >
                        <element.Component />
                      </DemoCard>
                    </li>,
                  ]
                : [];
            })}
          </ul>
          {section.items.some((item) => item.preview === undefined) ? (
            <ul role="list" className="mt-6 grid gap-x-16 lg:grid-cols-2">
              {section.items
                .filter((item) => item.preview === undefined)
                .map((item) => (
                  <li
                    key={item.slug}
                    className="flex flex-wrap items-start gap-x-6 gap-y-3 py-4"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <Link
                        href={item.href}
                        className="text-[0.9375rem] font-medium underline-offset-4 hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed text-pretty">
                        {item.tagline}
                      </p>
                    </div>
                    <AddToCartButton
                      slug={item.slug}
                      name={item.name}
                      variant="outline"
                    />
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      ))}
      <div className="border-foreground/10 border-t pt-8">
        <p className="text-muted-foreground mt-8 max-w-[52ch] text-[0.9375rem] leading-relaxed">
          {ELEMENT_PRODUCTS.length} elements can be added from their own pages.
        </p>
        <Link href="/elements" className={cn("mt-3", navLink)}>
          Browse elements
          <ArrowRightIcon aria-hidden className={navArrow} />
        </Link>
      </div>
    </PageFrame>
  );
}
