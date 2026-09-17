import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { NavGlyph } from "@/components/shared/nav-glyph";
import type { CatalogProduct } from "@/lib/catalog";

export function ProductRow({ product }: { product: CatalogProduct }) {
  return (
    <li>
      <Link
        href={`/shop/${product.slug}`}
        className="group/navlink flex items-start gap-5 py-8 sm:gap-8"
      >
        <NavGlyph kind={product.glyph} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-xl font-medium tracking-tight text-balance underline-offset-4 group-hover/navlink:underline">
            {product.name}
          </h2>
          <p className="text-muted-foreground max-w-[52ch] text-[0.9375rem] leading-relaxed text-pretty">
            {product.tagline}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            For {product.audience}.
          </p>
        </span>
        <ArrowRightIcon
          aria-hidden
          className="text-muted-foreground group-hover/navlink:text-foreground mt-1 size-4 shrink-0 transition-[color,translate] group-hover/navlink:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}
