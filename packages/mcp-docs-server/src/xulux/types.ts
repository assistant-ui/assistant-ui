// MCP-safe assistant-ui template catalog types. These mirror the payload served by the docs
// app at GET /api/xulux/mcp-catalog. The MCP package never imports docs-app
// internals; the endpoint payload is the contract.

export const XULUX_MCP_CATALOG_VERSION = 1;

export interface XuluxCatalogVersion {
  id: string;
  entryId: string;
  name: string;
  description: string;
  previewUrl: string;
  downloadUrl: string;
}

export interface XuluxCatalogTemplate {
  id: string;
  templateId: string;
  versionId: string | null;
  kind: "template" | "example";
  name: string;
  summary: string;
  assistantPlacement: string;
  features: string[];
  customizable: string[];
  versions: XuluxCatalogVersion[];
  previewUrl?: string;
  downloadUrl?: string;
  sandboxBaseUrl?: string;
  configRoots?: Record<string, unknown>;
  rules?: {
    required: string[];
    unsupported?: string[];
  };
  tools?: {
    builtIn: unknown[];
    customToolSupported: boolean;
    renderers: unknown[];
  };
}

export interface XuluxCatalog {
  version: number;
  generatedAt: string;
  docsOrigin: string;
  templates: XuluxCatalogTemplate[];
}

export interface XuluxCatalogResult {
  catalog: XuluxCatalog;
  /** True when the bundled fallback catalog was used instead of live data. */
  degraded: boolean;
  /** Present when the live fetch failed and the fallback was used. */
  degradedReason?: string;
}

export interface XuluxCatalogError {
  error: string;
  hint?: string;
}
