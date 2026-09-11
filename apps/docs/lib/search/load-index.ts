import type { SearchRecord } from "./types";

let pending: Promise<SearchRecord[]> | undefined;

export function loadSearchIndex(): Promise<SearchRecord[]> {
  pending ??= fetch("/api/search")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`search index failed: ${response.status}`);
      }
      return response.json() as Promise<SearchRecord[]>;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });

  return pending;
}
