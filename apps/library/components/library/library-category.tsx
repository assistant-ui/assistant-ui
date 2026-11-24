"use client";

import {
  getLibraryCategory,
  type LibraryCategoryId,
} from "@/lib/library/catalog";
import { useLibraryItems } from "./library-context";
import { LibraryPage } from "./library-page";
import { ProductGrid } from "./product-grid";

export function LibraryCategory({ category }: { category: LibraryCategoryId }) {
  const { label, description } = getLibraryCategory(category);
  const items = useLibraryItems(category);

  return (
    <LibraryPage title={label} count={items.length} description={description}>
      <ProductGrid items={items} />
    </LibraryPage>
  );
}
