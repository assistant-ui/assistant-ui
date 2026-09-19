import type { Metadata } from "next";
import { ProductRow } from "@/components/pages/catalog/product-row";
import { PageFrame } from "@/components/shared/page-frame";
import { typePage } from "@/components/shared/type";
import { CATALOG } from "@/lib/catalog";
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
    </PageFrame>
  );
}
