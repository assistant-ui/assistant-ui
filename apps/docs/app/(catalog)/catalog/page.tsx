import type { Metadata } from "next";
import { ProductRow } from "@/components/pages/catalog/product-row";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { CATALOG } from "@/lib/catalog";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Catalog";
const description =
  "Everything you can add to an assistant-ui project, ready for your coding agent to install.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  ...createOgMetadata(title, description),
};

export default function CatalogPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <h1 className={typePage}>Pick what your project needs.</h1>
        <p className={cn("mt-4", typeDeck)}>
          Open a product to see what it adds and put it in your cart, then hand
          the generated prompt to your coding agent. Every product is free; most
          are open source.
        </p>
      </header>

      <ul
        role="list"
        className="divide-foreground/10 border-foreground/10 mt-12 divide-y border-y"
      >
        {CATALOG.map((product) => (
          <ProductRow key={product.slug} product={product} />
        ))}
      </ul>
    </PageFrame>
  );
}
