import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/pages/catalog/product-card";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
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
        <p className={typeEyebrow}>Catalog</p>
        <h1 className={cn("mt-4", typePage)}>Pick what your project needs.</h1>
        <p className={cn("mt-4", typeDeck)}>
          Add products to your cart, then hand the generated prompt to your
          coding agent. Every product is free; most are open source.
        </p>
      </header>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        {CATALOG.map((product, index) => (
          <ProductCard key={product.slug} product={product} index={index + 1} />
        ))}
      </div>

      <footer className="border-foreground/10 mt-24 border-t pt-8">
        <p className="text-muted-foreground max-w-[48ch] text-sm leading-relaxed">
          Agents can read this catalog as markdown at{" "}
          <Link
            href="/catalog.md"
            className="text-foreground font-mono text-[0.8125rem] underline-offset-4 hover:underline"
          >
            /catalog.md
          </Link>
          , and a cart as{" "}
          <span className="text-foreground font-mono text-[0.8125rem]">
            /catalog/cart.md?items=…
          </span>
          .
        </p>
      </footer>
    </PageFrame>
  );
}
