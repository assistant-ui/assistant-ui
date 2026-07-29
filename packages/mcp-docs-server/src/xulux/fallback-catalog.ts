import {
  XULUX_MCP_CATALOG_VERSION,
  type XuluxCatalog,
  type XuluxCatalogTemplate,
} from "./types.js";

// Minimal bundled fallback catalog for degraded mode. It supports discovery
// (ids + names) only. Full authoring details and preview/download URLs
// require the live catalog endpoint. Do NOT grow this into a copy of the
// full template knowledge base — the docs endpoint owns freshness.

export const FALLBACK_NOTE =
  "The live assistant-ui template catalog could not be fetched, so this is minimal bundled fallback data. " +
  "Template details, previews, and downloads require live catalog access. " +
  "Check network access to the docs site or set XULUX_CATALOG_URL to a reachable catalog endpoint.";

const fallbackTemplate = (
  overrides: Pick<XuluxCatalogTemplate, "id" | "kind" | "name" | "summary">,
): XuluxCatalogTemplate => ({
  templateId: overrides.id,
  versionId: null,
  assistantPlacement: "unavailable in fallback mode",
  features: [],
  customizable: [],
  versions: [],
  ...overrides,
});

export const FALLBACK_CATALOG: XuluxCatalog = {
  version: XULUX_MCP_CATALOG_VERSION,
  generatedAt: "fallback",
  docsOrigin: "https://www.assistant-ui.com",
  templates: [
    fallbackTemplate({
      id: "base-assistant-ui",
      kind: "template",
      name: "Configurable Base Assistant UI",
      summary:
        "Hosted configurable assistant-ui Base chat template with threads, composer, suggestions, and no-key demo flows.",
    }),
    fallbackTemplate({
      id: "webpage-assistant",
      kind: "template",
      name: "Webpage with Assistant",
      summary:
        "Docs/website layout with a sidebar or modal assistant grounded in configurable pages.",
    }),
    fallbackTemplate({
      id: "product-page-assistant",
      kind: "template",
      name: "Product Page with Floating Assistant",
      summary:
        "Mock product dashboard with a floating modal support assistant and analyze-then-handoff flow.",
    }),
    fallbackTemplate({
      id: "expo-react-native",
      kind: "example",
      name: "Expo React Native Assistant",
      summary:
        "Mobile AI chat app built with Expo and assistant-ui React Native primitives.",
    }),
  ],
};
