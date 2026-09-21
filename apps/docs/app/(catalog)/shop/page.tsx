import type { Metadata } from "next";
import { ProductRow } from "@/components/pages/catalog/product-row";
import { PageFrame } from "@/components/shared/page-frame";
import { typePage } from "@/components/shared/type";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { AddToCartButton } from "@/components/pages/catalog/add-to-cart-button";
import { CATALOG } from "@/lib/catalog";
import { ELEMENT_PRODUCTS } from "@/lib/catalog/products/elements";
import { GUIDE_PRODUCTS } from "@/lib/catalog/products/guides";
import { createOgMetadata } from "@/lib/og";

const title = "Product Catalog";
const description = "Everything you can add to an assistant-ui project.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  ...createOgMetadata(title, description),
};

export default function CatalogPage() {
  return (
    <PageFrame pad="sub">
      <header>
        <h1 className={typePage}>assistant-ui Product Catalog</h1>
      </header>

      <ul
        role="list"
        className="divide-foreground/10 border-foreground/10 mt-12 divide-y border-y"
      >
        {CATALOG.map((product) => (
          <ProductRow key={product.slug} product={product} />
        ))}
      </ul>

      {GUIDE_PRODUCTS.length > 0 ? (
        <section aria-labelledby="guides-heading" className="mt-16">
          <h2
            id="guides-heading"
            className="text-xl font-medium tracking-tight"
          >
            Guides your agent can carry out
          </h2>
          <ul
            role="list"
            className="divide-foreground/10 border-foreground/10 mt-6 divide-y border-y"
          >
            {GUIDE_PRODUCTS.map((guide) => (
              <li
                key={guide.slug}
                className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <Link
                    href={guide.href}
                    className="text-[0.9375rem] font-medium underline-offset-4 hover:underline"
                  >
                    {guide.name}
                  </Link>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed text-pretty">
                    {guide.tagline}
                  </p>
                </div>
                <AddToCartButton
                  slug={guide.slug}
                  name={guide.name}
                  variant="outline"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="elements-heading" className="mt-16">
        <h2
          id="elements-heading"
          className="text-xl font-medium tracking-tight"
        >
          Elements
        </h2>
        <p className="text-muted-foreground mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed">
          {ELEMENT_PRODUCTS.length} components you can add to the cart from
          their own pages.
        </p>
        <Link
          href="/elements"
          className="group/navlink mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          Browse elements
          <ArrowRightIcon
            aria-hidden
            className="size-3.5 transition-[translate] group-hover/navlink:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </section>
    </PageFrame>
  );
}
