"use client";

import Link from "next/link";
import {
  LIBRARY_CATEGORIES,
  libraryCategoryHref,
  type LibraryItem,
} from "@/lib/library/catalog";
import { LibraryGlyph } from "./library-glyph";
import {
  useLibrary,
  useLibraryCounts,
  useLibraryItems,
} from "./library-context";
import { LibraryPage } from "./library-page";
import { ProductList } from "./product-grid";

function Categories() {
  const counts = useLibraryCounts();

  return (
    <ul role="list" className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
      {LIBRARY_CATEGORIES.map(({ id, label, description }) => (
        <li key={id}>
          <Link
            href={libraryCategoryHref(id)}
            data-nav-glyph-motion
            className="group/navlink border-border/60 hover:border-foreground/20 hover:bg-foreground/[0.03] focus-visible:border-ring flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150 outline-none motion-reduce:transition-none"
          >
            <span className="border-foreground/10 bg-background rounded-document grid size-11 shrink-0 place-items-center border">
              <LibraryGlyph category={id} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-strong text-foreground text-[0.8125rem] leading-[1.125rem]">
                {label}
              </span>
              <span className="text-muted-foreground truncate text-[0.8125rem] leading-[1.125rem]">
                {description}
              </span>
            </span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {counts.get(id) ?? 0}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Results({ items }: { items: readonly LibraryItem[] }) {
  const { sort } = useLibrary();

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing matches.</p>;
  }

  if (sort === "name") return <ProductList items={items} />;

  return (
    <div className="flex flex-col gap-6">
      {LIBRARY_CATEGORIES.flatMap(({ id, label }) => {
        const listed = items.filter((item) => item.category === id);
        if (listed.length === 0) return [];
        return [
          <section key={id} className="flex flex-col gap-1">
            <h2 className="font-strong flex items-baseline gap-2 text-sm">
              <Link
                href={libraryCategoryHref(id)}
                className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:underline"
              >
                {label}
              </Link>
              <span className="text-muted-foreground font-regular text-xs tabular-nums">
                {listed.length}
              </span>
            </h2>
            <ProductList items={listed} />
          </section>,
        ];
      })}
    </div>
  );
}

/**
 * The library's home: every category, as a card that opens it. A search or a
 * filter turns the cards into the items it leaves.
 */
export function LibraryHome() {
  const { items, query, show, sort } = useLibrary();
  const results = useLibraryItems();
  const narrowed = query.trim() !== "" || show !== "all" || sort !== "category";

  return (
    <LibraryPage
      title="Library"
      description={`${items.length} parts for building an assistant, each with an install command and a prompt for your coding agent.`}
    >
      {narrowed ? <Results items={results} /> : <Categories />}
    </LibraryPage>
  );
}
