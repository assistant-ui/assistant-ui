import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { NavGlyph } from "@/components/shared/nav-glyph";
import type { CatalogProduct } from "@/lib/catalog";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductMeta } from "./product-meta";

export function ProductCard({
  product,
  index,
}: {
  product: CatalogProduct;
  index: number;
}) {
  return (
    <article className="group/navlink border-foreground/10 hover:border-foreground/25 rounded-document relative flex flex-col border p-5 transition-colors md:p-6">
      <NavGlyph kind={product.glyph} size="lg" />

      <div className="mt-6 flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline gap-2.5">
          <span className="text-muted-foreground font-mono text-[0.6875rem] tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <ProductMeta product={product} />
        </div>
        <h2 className="text-lg font-medium tracking-tight text-balance">
          <Link
            href={`/catalog/${product.slug}`}
            className="underline-offset-4 after:absolute after:inset-0 hover:underline"
          >
            {product.name}
          </Link>
        </h2>
        <p className="text-muted-foreground text-[0.9375rem] leading-relaxed text-pretty">
          {product.tagline}
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          For {product.audience}.
        </p>
      </div>

      <div className="relative mt-8 flex items-center justify-between gap-3">
        <AddToCartButton slug={product.slug} name={product.name} />
        <Link
          href={`/catalog/${product.slug}`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          Details
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
