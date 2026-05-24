import { describe, it, expect } from "vitest";
import { anthropicToolSearchAdapter } from "../anthropic";
import type { Tool } from "../../tool-types";

const stubTool = (): Tool<any, any> =>
  ({
    description: "stub",
    parameters: { type: "object", properties: {} },
  }) as unknown as Tool<any, any>;

describe("anthropicToolSearchAdapter", () => {
  describe("variant selection", () => {
    it("defaults to bm25 variant", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.tools["tool_search_tool_bm25"]).toBeDefined();
      expect((result.tools["tool_search_tool_bm25"] as any).type).toBe(
        "tool_search_tool_bm25_20251119",
      );
      expect(result.tools["tool_search_tool_regex"]).toBeUndefined();
    });

    it("uses bm25 variant when explicitly specified", () => {
      const adapter = anthropicToolSearchAdapter({ variant: "bm25" });
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      const entry = result.tools["tool_search_tool_bm25"] as any;
      expect(entry).toBeDefined();
      expect(entry.type).toBe("tool_search_tool_bm25_20251119");
      expect(entry.name).toBe("tool_search_tool_bm25");
    });

    it("uses regex variant when specified", () => {
      const adapter = anthropicToolSearchAdapter({ variant: "regex" });
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      const entry = result.tools["tool_search_tool_regex"] as any;
      expect(entry).toBeDefined();
      expect(entry.type).toBe("tool_search_tool_regex_20251119");
      expect(entry.name).toBe("tool_search_tool_regex");
      expect(result.tools["tool_search_tool_bm25"]).toBeUndefined();
    });
  });

  describe("providerOptions.anthropic.deferLoading stamping", () => {
    it("stamps providerOptions.anthropic.deferLoading: true on each deferred tool", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { toolA: stubTool(), toolB: stubTool() },
      });

      expect(
        (result.tools["toolA"] as any).providerOptions?.anthropic?.deferLoading,
      ).toBe(true);
      expect(
        (result.tools["toolB"] as any).providerOptions?.anthropic?.deferLoading,
      ).toBe(true);
    });

    it("does not stamp providerOptions on core tools", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: { deferredTool: stubTool() },
      });

      expect((result.tools["coreTool"] as any).providerOptions).toBeUndefined();
      expect(
        (result.tools["deferredTool"] as any).providerOptions?.anthropic
          ?.deferLoading,
      ).toBe(true);
    });

    it("does not emit the old top-level defer_loading flag", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect((result.tools["myTool"] as any).defer_loading).toBeUndefined();
    });
  });

  describe("beta header", () => {
    it("emits anthropic-beta header when deferred tools are present", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.extraHeaders?.["anthropic-beta"]).toBe(
        "advanced-tool-use-2025-11-20",
      );
    });

    it("does not emit anthropic-beta header when no deferred tools", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: undefined,
      });

      expect(result.extraHeaders?.["anthropic-beta"]).toBeUndefined();
    });

    it("does not emit anthropic-beta header when deferredTools is empty object", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: {},
      });

      expect(result.extraHeaders?.["anthropic-beta"]).toBeUndefined();
    });

    it("respects custom betaHeader override", () => {
      const adapter = anthropicToolSearchAdapter({
        betaHeader: "advanced-tool-use-2099-01-01",
      });
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.extraHeaders?.["anthropic-beta"]).toBe(
        "advanced-tool-use-2099-01-01",
      );
    });
  });

  describe("tool_search entry injection", () => {
    it("injects search tool entry when deferred tools are present", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.tools["tool_search_tool_bm25"]).toBeDefined();
    });

    it("does not inject search tool entry when no deferred tools", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: undefined,
      });

      expect(result.tools["tool_search_tool_bm25"]).toBeUndefined();
    });

    it("does not set include_tool_search_tool body flag", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.extraBody?.["include_tool_search_tool"]).toBeUndefined();
    });
  });

  describe("adapter id", () => {
    it("has id anthropic-tool-search", () => {
      const adapter = anthropicToolSearchAdapter();
      expect(adapter.id).toBe("anthropic-tool-search");
    });
  });

  describe("catalog support (Phase 4)", () => {
    it("injects one __aui_catalog_search__ entry per catalog", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "my-catalog" }],
      });

      const entry = result.tools["__aui_catalog_search__my-catalog"] as any;
      expect(entry).toBeDefined();
    });

    it("catalog search entry carries providerOptions.anthropic.toModelOutputAsToolReference: true", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "shop" }],
      });

      const entry = result.tools["__aui_catalog_search__shop"] as any;
      expect(
        entry.providerOptions?.anthropic?.toModelOutputAsToolReference,
      ).toBe(true);
    });

    it("catalog search entry carries providerOptions.aui.catalogId", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "shop" }],
      });

      const entry = result.tools["__aui_catalog_search__shop"] as any;
      expect(entry.providerOptions?.aui?.catalogId).toBe("shop");
    });

    it("injects one entry per catalog when multiple catalogs provided", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "cat-a" }, { catalogId: "cat-b" }],
      });

      expect(result.tools["__aui_catalog_search__cat-a"]).toBeDefined();
      expect(result.tools["__aui_catalog_search__cat-b"]).toBeDefined();
    });

    it("catalog knownTools are included as deferred entries with anthropic.deferLoading", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [
          {
            catalogId: "shop",
            knownTools: { shopTool: stubTool() },
          },
        ],
      });

      expect(
        (result.tools["shopTool"] as any).providerOptions?.anthropic
          ?.deferLoading,
      ).toBe(true);
    });

    it("catalog knownTools trigger the deferred search entry and beta header", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [
          {
            catalogId: "shop",
            knownTools: { shopTool: stubTool() },
          },
        ],
      });

      expect(result.tools["tool_search_tool_bm25"]).toBeDefined();
      expect(result.extraHeaders?.["anthropic-beta"]).toBe(
        "advanced-tool-use-2025-11-20",
      );
    });

    it("no catalog entries when catalogs array is empty", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: { core: stubTool() },
        deferredTools: undefined,
        catalogs: [],
      });

      const catalogKeys = Object.keys(result.tools).filter((k) =>
        k.startsWith("__aui_catalog_search__"),
      );
      expect(catalogKeys).toHaveLength(0);
    });

    it("no catalog entries when catalogs is undefined", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: { core: stubTool() },
        deferredTools: undefined,
      });

      const catalogKeys = Object.keys(result.tools).filter((k) =>
        k.startsWith("__aui_catalog_search__"),
      );
      expect(catalogKeys).toHaveLength(0);
    });
  });

  describe("combined core and deferred tools", () => {
    it("merges core and deferred tools in output", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: { deferredTool: stubTool() },
      });

      expect(result.tools).toHaveProperty("coreTool");
      expect(result.tools).toHaveProperty("deferredTool");
    });

    it("handles undefined tools gracefully", () => {
      const adapter = anthropicToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
      });

      expect(result.tools).toEqual({});
      expect(result.extraHeaders).toBeUndefined();
    });
  });
});
