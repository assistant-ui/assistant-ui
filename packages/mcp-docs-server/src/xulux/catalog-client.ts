import { z } from "zod";
import { logger } from "../utils/logger.js";
import { FALLBACK_CATALOG, FALLBACK_NOTE } from "./fallback-catalog.js";
import {
  XULUX_MCP_CATALOG_VERSION,
  type XuluxCatalog,
  type XuluxCatalogResult,
} from "./types.js";

export const DEFAULT_CATALOG_URL =
  "https://www.assistant-ui.com/api/xulux/mcp-catalog";

const CATALOG_TTL_MS = 5 * 60 * 1000;
const catalogUrlSchema = z.url();

const catalogVersionSchema = z.looseObject({
  id: z.string(),
  entryId: z.string(),
  name: z.string(),
  description: z.string(),
  previewUrl: catalogUrlSchema,
  downloadUrl: catalogUrlSchema,
});

const catalogTemplateSchema = z.looseObject({
  id: z.string(),
  templateId: z.string(),
  versionId: z.string().nullable(),
  kind: z.enum(["template", "example"]),
  name: z.string(),
  summary: z.string(),
  assistantPlacement: z.string(),
  features: z.array(z.string()),
  customizable: z.array(z.string()),
  versions: z.array(catalogVersionSchema),
  previewUrl: catalogUrlSchema.optional(),
  downloadUrl: catalogUrlSchema.optional(),
  sandboxBaseUrl: catalogUrlSchema.optional(),
  configRoots: z.record(z.string(), z.unknown()).optional(),
  rules: z
    .looseObject({
      required: z.array(z.string()),
      unsupported: z.array(z.string()).optional(),
    })
    .optional(),
  tools: z
    .looseObject({
      builtIn: z.array(z.unknown()),
      customToolSupported: z.boolean(),
      renderers: z.array(z.unknown()),
    })
    .optional(),
});

const catalogSchema = z.looseObject({
  version: z.literal(XULUX_MCP_CATALOG_VERSION),
  // Not read anywhere in the package; validated for shape only, so an unused
  // field cannot veto the whole catalog.
  generatedAt: z.string(),
  docsOrigin: z.string(),
  templates: z.array(catalogTemplateSchema),
});

export function getCatalogUrl(): string {
  const override = process.env.XULUX_CATALOG_URL?.trim();
  return override || DEFAULT_CATALOG_URL;
}

function validateCatalog(data: unknown): XuluxCatalog {
  // Checked ahead of the schema so a catalog rollout reports its version
  // rather than reading as a malformed payload.
  const version = (data as { version?: unknown } | null)?.version;
  if (version !== undefined && version !== XULUX_MCP_CATALOG_VERSION) {
    throw new Error(
      `Unsupported catalog version: ${String(version)}. Expected ${XULUX_MCP_CATALOG_VERSION}.`,
    );
  }
  const result = catalogSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
    throw new Error(
      `Catalog response is malformed${path}: ${issue?.message ?? "invalid catalog"}.`,
    );
  }
  return result.data;
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
    logger.warn(
      `assistant-ui template catalog fetch failed (${url}): ${message}`,
    );

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
