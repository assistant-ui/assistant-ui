"use client";

import { useSyncExternalStore } from "react";
import { DOCS_URL } from "@/lib/config";

/**
 * Product names by slug, read from the docs catalog: its products are
 * `## Name` sections with a `Slug: slug` line, its guides and elements are
 * `- slug: Name (url, …)` bullets.
 */
export const parseCatalog = (markdown: string): Map<string, string> => {
  const names = new Map<string, string>();
  for (const match of markdown.matchAll(/^## (.+)\n+Slug: (\S+)$/gm)) {
    names.set(match[2]!, match[1]!.trim());
  }
  for (const match of markdown.matchAll(
    /^- ([a-z0-9][a-z0-9/-]*): ([^(\n]+?) \(https?:\/\//gm,
  )) {
    names.set(match[1]!, match[2]!.trim());
  }
  return names;
};

/** The install guide the agent reads for a product. */
export const installGuideUrl = (slug: string) =>
  `${DOCS_URL}/install.md?items=${encodeURIComponent(slug)}`;

/** The docs page of a product listed on the Components page. */
export const productPageUrl = (slug: string) =>
  `${DOCS_URL}/components/${slug}`;

type CatalogState = Map<string, string> | null | undefined;

const listeners = new Set<() => void>();
let catalog: CatalogState;
let started = false;

const load = () => {
  if (started) return;
  started = true;
  fetch(`${DOCS_URL}/catalog.md`, { cache: "no-store" })
    .then((response) => (response.ok ? response.text() : null))
    .then((markdown) => (markdown === null ? null : parseCatalog(markdown)))
    .catch(() => null)
    .then((next) => {
      catalog = next;
      for (const listener of listeners) listener();
    });
};

const subscribe = (listener: () => void) => {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The catalog's product names, `undefined` while it loads and `null` when it could not be read. */
export const useCatalog = (): CatalogState =>
  useSyncExternalStore(
    subscribe,
    () => catalog,
    () => undefined,
  );

/** Lets a test start from a known catalog. */
export const setCatalogForTesting = (next: CatalogState) => {
  started = true;
  catalog = next;
  for (const listener of listeners) listener();
};
