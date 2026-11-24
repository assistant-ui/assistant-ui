"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createCartStore } from "@/lib/library/cart-store";
import {
  matchesLibraryQuery,
  type LibraryCategoryId,
  type LibraryItem,
} from "@/lib/library/catalog";

export const libraryCart = createCartStore("aui-library-cart");

export const LIBRARY_SHOWS = [
  { value: "all", label: "Everything" },
  { value: "install", label: "With an install command" },
  { value: "cart", label: "In the cart" },
] as const;

export const LIBRARY_SORTS = [
  { value: "category", label: "Category" },
  { value: "name", label: "Name" },
] as const;

export type LibraryShow = (typeof LIBRARY_SHOWS)[number]["value"];
export type LibrarySort = (typeof LIBRARY_SORTS)[number]["value"];

type LibraryContextValue = {
  items: readonly LibraryItem[];
  query: string;
  setQuery: (query: string) => void;
  show: LibraryShow;
  setShow: (show: LibraryShow) => void;
  sort: LibrarySort;
  setSort: (sort: LibrarySort) => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context)
    throw new Error("useLibrary must be used within <LibraryProvider>.");
  return context;
}

export function LibraryProvider({
  items,
  children,
}: {
  items: readonly LibraryItem[];
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<LibraryShow>("all");
  const [sort, setSort] = useState<LibrarySort>("category");
  const value = useMemo(
    () => ({ items, query, setQuery, show, setShow, sort, setSort }),
    [items, query, show, sort],
  );
  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

/** The cart's items in the order they were added. */
export function useCartItems(): readonly LibraryItem[] {
  const { items } = useLibrary();
  const ids = libraryCart.useCartSlugs();
  return useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }, [items, ids]);
}

/** How many items each category holds once the search has narrowed them. */
export function useLibraryCounts(): ReadonlyMap<LibraryCategoryId, number> {
  const { items, query } = useLibrary();
  return useMemo(() => {
    const tally = new Map<LibraryCategoryId, number>();
    for (const item of items) {
      if (!matchesLibraryQuery(item, query)) continue;
      tally.set(item.category, (tally.get(item.category) ?? 0) + 1);
    }
    return tally;
  }, [items, query]);
}

/**
 * The items the search and the filter leave, in one category or in all of
 * them, by name when the filter sorts that way.
 */
export function useLibraryItems(
  category?: LibraryCategoryId,
): readonly LibraryItem[] {
  const { items, query, show, sort } = useLibrary();
  const cart = libraryCart.useCartSlugs();
  return useMemo(() => {
    const left = items.filter(
      (item) =>
        (category === undefined || item.category === category) &&
        matchesLibraryQuery(item, query) &&
        (show !== "install" || item.install !== undefined) &&
        (show !== "cart" || cart.includes(item.id)),
    );
    return sort === "name"
      ? left.toSorted((a, b) => a.name.localeCompare(b.name))
      : left;
  }, [items, query, show, sort, cart, category]);
}
