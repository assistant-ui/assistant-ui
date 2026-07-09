import { logger } from "../utils/logger.js";
import { FALLBACK_CATALOG, FALLBACK_NOTE } from "./fallback-catalog.js";
import type { XuluxCatalog, XuluxCatalogResult } from "./types.js";

export const DEFAULT_CATALOG_URL =
  "https://www.assistant-ui.com/api/xulux/mcp-catalog";

const CATALOG_TTL_MS = 5 * 60 * 1000;

export function getCatalogUrl(): string {
  const override = process.env.XULUX_CATALOG_URL?.trim();
  return override || DEFAULT_CATALOG_URL;
}

function validateCatalog(data: unknown): XuluxCatalog {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Catalog response is not a JSON object.");
  }
  const catalog = data as XuluxCatalog;
  if (catalog.version !== 1) {
    throw new Error(
      `Unsupported catalog version: ${String(catalog.version)}. Expected 1.`,
    );
  }
  if (!Array.isArray(catalog.templates)) {
    throw new Error("Catalog response has no templates array.");
  }
  for (const template of catalog.templates) {
    if (
      !template ||
      typeof template !== "object" ||
      typeof template.id !== "string" ||
      typeof template.templateId !== "string" ||
      (template.kind !== "template" && template.kind !== "example")
    ) {
      throw new Error(
        "Catalog response contains a malformed template entry (missing id/templateId/kind).",
      );
    }
  }
  return catalog;
}

interface CacheEntry {
  catalog: XuluxCatalog;
  fetchedAt: number;
  url: string;
}

let cache: CacheEntry | null = null;

export function clearCatalogCache(): void {
  cache = null;
}

async function fetchCatalog(url: string): Promise<XuluxCatalog> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  return validateCatalog(data);
}

/**
 * Returns the assistant-ui template catalog. Uses an in-memory five-minute cache, and falls
 * back to a minimal bundled catalog (marked degraded) when the live fetch
 * fails and no cached copy exists.
 */
export async function getXuluxCatalog(): Promise<XuluxCatalogResult> {
  const url = getCatalogUrl();
  const now = Date.now();

  if (cache && cache.url === url && now - cache.fetchedAt < CATALOG_TTL_MS) {
    return { catalog: cache.catalog, degraded: false };
  }

  try {
    const catalog = await fetchCatalog(url);
    cache = { catalog, fetchedAt: now, url };
    return { catalog, degraded: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`assistant-ui template catalog fetch failed (${url}): ${message}`);

    // Prefer a stale cached copy over the minimal fallback.
    if (cache && cache.url === url) {
      return {
        catalog: cache.catalog,
        degraded: true,
        degradedReason: `Live catalog refresh failed (${message}); using previously fetched catalog.`,
      };
    }

    return {
      catalog: FALLBACK_CATALOG,
      degraded: true,
      degradedReason: `${message} ${FALLBACK_NOTE}`,
    };
  }
}
