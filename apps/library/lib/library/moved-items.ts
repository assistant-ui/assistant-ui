import { MOVED_DOCS_PATHS } from "@/lib/moved-docs";

/** The id of the item a docs page under `/docs/<category>/…` becomes. */
export const docsItemId = (category: string, path: string): string =>
  `${category}/${path.split("/").slice(1).join("-")}`;

const idOfDocsUrl = (url: string): string | null => {
  const path = url.split("#")[0]!.replace(/^\/docs\//, "");
  if (path === url || !path.includes("/")) return null;
  return docsItemId(path.split("/")[0]!, path);
};

const renames = new Map<string, string>();
for (const [from, to] of MOVED_DOCS_PATHS) {
  const oldId = idOfDocsUrl(from);
  const newId = idOfDocsUrl(to);
  if (oldId && newId && oldId !== newId) renames.set(oldId, newId);
}

const follow = (id: string): string => {
  const seen = new Set([id]);
  let current = id;
  for (let next = renames.get(current); next; next = renames.get(current)) {
    if (seen.has(next)) break;
    seen.add(next);
    current = next;
  }
  return current;
};

/**
 * The ids docs-backed items had before their page moved, mapped to the ids
 * they have now. Carts saved in browser storage still hold the old ids.
 */
export const MOVED_ITEM_IDS: ReadonlyMap<string, string> = new Map(
  [...renames.keys()].map((id) => [id, follow(id)]),
);
