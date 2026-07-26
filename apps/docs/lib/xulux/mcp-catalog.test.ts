import { describe, expect, it } from "vitest";
import { buildXuluxMcpCatalog } from "./mcp-catalog";
import { GET } from "@/app/api/xulux/mcp-catalog/route";

const ORIGIN = "https://docs.example.com";

describe("buildXuluxMcpCatalog", () => {
  const catalog = buildXuluxMcpCatalog(ORIGIN);

  it("returns a versioned payload with the docs origin", () => {
    expect(catalog.version).toBe(1);
    expect(catalog.docsOrigin).toBe(ORIGIN);
    expect(typeof catalog.generatedAt).toBe("string");
    expect(Array.isArray(catalog.templates)).toBe(true);
  });

  it("includes the required template ids", () => {
    const ids = catalog.templates.map((t) => t.templateId);
    expect(ids).toContain("base-assistant-ui");
    expect(ids).toContain("webpage-assistant");
    expect(ids).toContain("product-page-assistant");
    expect(ids).toContain("expo-react-native");
  });

  it("does not duplicate template ids", () => {
    const ids = catalog.templates.map((t) => t.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves fixed demo relative URLs to absolute URLs", () => {
    const fixedDemos = catalog.templates.filter((t) => t.kind === "example");
    expect(fixedDemos.length).toBeGreaterThan(0);
    for (const demo of fixedDemos) {
      if (demo.previewUrl) {
        expect(demo.previewUrl).toMatch(/^https?:\/\//);
      }
      if (demo.downloadUrl) {
        expect(demo.downloadUrl).toMatch(/^https?:\/\//);
      }
    }
  });

  it("absolutizes docs-relative demo URLs against the request origin", () => {
    const base = catalog.templates.find((t) => t.templateId === "base");
    expect(base).toBeDefined();
    expect(base!.previewUrl).toBe(`${ORIGIN}/demos/base`);
    expect(base!.downloadUrl).toBe(
      `${ORIGIN}/api/xulux/demo-download?slug=base`,
    );
  });

  it("includes the expo-react-native special case with hosted preview", () => {
    const expo = catalog.templates.find(
      (t) => t.templateId === "expo-react-native",
    );
    expect(expo).toBeDefined();
    expect(expo!.kind).toBe("example");
    expect(expo!.previewUrl).toMatch(/^https:\/\//);
    expect(expo!.name).toBe("Expo React Native Assistant");
  });

  it("includes authoring metadata for configurable templates", () => {
    for (const id of [
      "base-assistant-ui",
      "webpage-assistant",
      "product-page-assistant",
    ]) {
      const template = catalog.templates.find((t) => t.templateId === id);
      expect(template, id).toBeDefined();
      expect(template!.kind).toBe("template");
      expect(template!.configRoots).toBeDefined();
      expect(template!.rules?.required.length).toBeGreaterThan(0);
      expect(template!.tools?.builtIn.length).toBeGreaterThan(0);
      expect(template!.customizable.length).toBeGreaterThan(0);
      expect(template!.sandboxBaseUrl).toMatch(/^https:\/\//);
    }
  });

  it("includes per-version preview/download URLs with entry ids", () => {
    const webpage = catalog.templates.find(
      (t) => t.templateId === "webpage-assistant",
    );
    expect(webpage!.versions.length).toBeGreaterThan(0);
    for (const version of webpage!.versions) {
      expect(version.entryId).toBe(`webpage-assistant-${version.id}`);
      expect(version.previewUrl).toMatch(/^https?:\/\//);
      expect(version.downloadUrl).toMatch(/^https?:\/\//);
    }
  });

  it("does not leak frontend-only fields", () => {
    for (const template of catalog.templates) {
      expect(template).not.toHaveProperty("gradient");
      expect(template).not.toHaveProperty("categoryName");
      expect(template).not.toHaveProperty("featured");
      expect(template).not.toHaveProperty("previewFrame");
    }
  });

  it("serves the public route with cache headers", async () => {
    const response = GET(new Request(`${ORIGIN}/api/xulux/mcp-catalog`));
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=300",
    );
    const payload = await response.json();
    expect(payload.docsOrigin).toBe(ORIGIN);
    expect(payload.templates.length).toBeGreaterThan(0);
  });
});
