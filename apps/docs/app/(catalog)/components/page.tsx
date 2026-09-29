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
import { CATALOG, formatMinutes } from "@/lib/catalog";
import { assistantUi } from "@/lib/catalog/products/assistant-ui";
import { ELEMENT_PRODUCTS } from "@/lib/catalog/products/elements";
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

const ADDITIONS = [
  ...CATALOG.filter((product) => product.slug !== assistantUi.slug),
  ...GUIDE_PRODUCTS,
];

const PREVIEWED = ADDITIONS.flatMap((item) => {
  const element = item.preview ? getElement(item.preview) : undefined;
  return element ? [{ item, element }] : [];
});

const UNPREVIEWED = ADDITIONS.filter((item) => item.preview === undefined);

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

      <section
        aria-labelledby="starter-heading"
        className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        <div className="group/navlink">
          <NavGlyph kind={assistantUi.glyph} />
          <h2 id="starter-heading" className={cn("mt-6", typeSection)}>
            Chat Starter
          </h2>
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
          <h3 className="text-sm font-medium">Works out of the box</h3>
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
          <h3 className="mt-8 text-sm font-medium">In the bundle</h3>
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

      <section
        aria-labelledby="additions-heading"
        className="border-foreground/10 mt-16 border-t pt-10"
      >
        <h2 id="additions-heading" className="sr-only">
          Everything else you can add
        </h2>
        <ul
          role="list"
          className="grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3"
        >
          {PREVIEWED.map(({ item, element }) => (
            <li
              key={item.slug}
              className={cn(element.wide && "md:col-span-2 xl:col-span-3")}
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
            </li>
          ))}
        </ul>
        <h3 className="mt-16 text-sm font-medium">Also available</h3>
        <ul role="list" className="mt-2 grid gap-x-16 lg:grid-cols-2">
          {UNPREVIEWED.map((item) => (
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
        <p className="text-muted-foreground mt-8 max-w-[52ch] text-[0.9375rem] leading-relaxed">
          {ELEMENT_PRODUCTS.length} elements can be added from their own pages.
        </p>
        <Link href="/elements" className={cn("mt-3", navLink)}>
          Browse elements
          <ArrowRightIcon aria-hidden className={navArrow} />
        </Link>
      </section>
    </PageFrame>
  );
}
