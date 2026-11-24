"use client";

import {
  getLibraryCategory,
  type LibraryCategoryId,
} from "@/lib/library/catalog";
import { useLibraryItems, useLibrarySections } from "./library-context";
import { LibraryPage } from "./library-page";
import { ProductGrid } from "./product-grid";

export function LibraryCategory({ category }: { category: LibraryCategoryId }) {
  const { label, description } = getLibraryCategory(category);
  const items = useLibraryItems(category);
  const sections = useLibrarySections(category);

  return (
    <LibraryPage
      title={label}
      count={items.length}
      description={description}
      sections={sections}
    >
      <ProductGrid items={items} />
    </LibraryPage>
  );
}
