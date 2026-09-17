import type { CatalogProduct } from "@/lib/catalog";
import { CATALOG_KIND_LABELS } from "@/lib/catalog";

export function ProductMeta({ product }: { product: CatalogProduct }) {
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 font-mono text-[0.6875rem]">
      <span>{CATALOG_KIND_LABELS[product.kind]}</span>
      <span aria-hidden>·</span>
      <span>{product.license}</span>
      {product.oss ? (
        <>
          <span aria-hidden>·</span>
          <span>Open source</span>
        </>
      ) : null}
    </p>
  );
}
