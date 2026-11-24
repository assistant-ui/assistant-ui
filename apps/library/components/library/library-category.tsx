"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  getLibraryCategory,
  type LibraryCategoryId,
} from "@/lib/library/catalog";
import { NEW_THEME_PATH } from "@/lib/library/themes";
import { cn } from "@/lib/utils";
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
      action={
        category === "themes" ? (
          <Link
            href={NEW_THEME_PATH}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 shrink-0 pointer-coarse:h-10",
            )}
          >
            New theme
          </Link>
        ) : undefined
      }
    >
      <ProductGrid items={items} />
    </LibraryPage>
  );
}
