import { describe, it, expect } from "vitest";
import { openaiToolSearchAdapter } from "../openai";
import type { Tool } from "../../tool-types";

const stubTool = (): Tool<any, any> =>
  ({
    description: "stub",
    parameters: { type: "object", properties: {} },
  }) as unknown as Tool<any, any>;

describe("openaiToolSearchAdapter", () => {
  describe("tool_search entry injection", () => {
    it("injects tool_search entry when deferred tools are present", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.tools.tool_search).toBeDefined();
      expect((result.tools.tool_search as any).type).toBe("tool_search");
    });

    it("does not inject tool_search entry when no deferred tools", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: undefined,
      });

      expect(result.tools.tool_search).toBeUndefined();
    });

    it("does not inject tool_search entry when deferredTools is empty object", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: {},
      });

      expect(result.tools.tool_search).toBeUndefined();
    });
  });

  describe("providerOptions.openai.deferLoading stamping", () => {
    it("stamps providerOptions.openai.deferLoading: true on each deferred tool", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { toolA: stubTool(), toolB: stubTool() },
      });

      expect(
        (result.tools.toolA as any).providerOptions?.openai?.deferLoading,
      ).toBe(true);
      expect(
        (result.tools.toolB as any).providerOptions?.openai?.deferLoading,
      ).toBe(true);
    });

    it("does not stamp providerOptions on core tools", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: { deferredTool: stubTool() },
      });

      expect((result.tools.coreTool as any).providerOptions).toBeUndefined();
      expect(
        (result.tools.deferredTool as any).providerOptions?.openai
          ?.deferLoading,
      ).toBe(true);
    });

    it("does not stamp Anthropic-specific fields", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(
        (result.tools.myTool as any).providerOptions?.anthropic,
      ).toBeUndefined();
    });
  });

  describe("no Anthropic headers", () => {
    it("does not emit anthropic-beta header", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.extraHeaders?.["anthropic-beta"]).toBeUndefined();
    });

    it("does not emit any extra headers at all", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: { myTool: stubTool() },
      });

      expect(result.extraHeaders).toBeUndefined();
    });
  });

  describe("adapter id", () => {
    it("has id openai-tool-search:hosted by default", () => {
      const adapter = openaiToolSearchAdapter();
      expect(adapter.id).toBe("openai-tool-search:hosted");
    });

    it("has id openai-tool-search:hosted when mode is hosted", () => {
      const adapter = openaiToolSearchAdapter({ mode: "hosted" });
      expect(adapter.id).toBe("openai-tool-search:hosted");
    });

    it("has id openai-tool-search:client when mode is client", () => {
      const adapter = openaiToolSearchAdapter({ mode: "client" });
      expect(adapter.id).toBe("openai-tool-search:client");
    });
  });

  describe("combined core and deferred tools", () => {
    it("merges core and deferred tools in output", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: { deferredTool: stubTool() },
      });

      expect(result.tools).toHaveProperty("coreTool");
      expect(result.tools).toHaveProperty("deferredTool");
    });

    it("handles undefined tools gracefully", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
      });

      expect(result.tools).toEqual({});
      expect(result.extraHeaders).toBeUndefined();
    });
  });

  describe("tool name sorting", () => {
    it("sorts tool names alphabetically for cache stability", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: { zebra: stubTool(), apple: stubTool() },
        deferredTools: { mango: stubTool(), banana: stubTool() },
      });

      const keys = Object.keys(result.tools).filter((k) => k !== "tool_search");
      expect(keys).toEqual([...keys].sort());
    });
  });

  describe("catalog support (Phase 4)", () => {
    it("injects one tool_search__<id> entry per catalog", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "my-catalog" }],
      });

      const entry = result.tools["tool_search__my-catalog"] as any;
      expect(entry).toBeDefined();
    });

    it("catalog search entry has type: tool_search and execution: client", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "shop" }],
      });

      const entry = result.tools["tool_search__shop"] as any;
      expect(entry.type).toBe("tool_search");
      expect(entry.execution).toBe("client");
    });

    it("catalog search entry carries providerOptions.aui.catalogId", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "shop" }],
      });

      const entry = result.tools["tool_search__shop"] as any;
      expect(entry.providerOptions?.aui?.catalogId).toBe("shop");
    });

    it("injects one entry per catalog when multiple catalogs provided", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: undefined,
        deferredTools: undefined,
        catalogs: [{ catalogId: "cat-a" }, { catalogId: "cat-b" }],
      });

      expect(result.tools["tool_search__cat-a"]).toBeDefined();
      expect(result.tools["tool_search__cat-b"]).toBeDefined();
    });

    it("no catalog entries when catalogs array is empty", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: { core: stubTool() },
        deferredTools: undefined,
        catalogs: [],
      });

      const catalogKeys = Object.keys(result.tools).filter((k) =>
        k.startsWith("tool_search__"),
      );
      expect(catalogKeys).toHaveLength(0);
    });

    it("no catalog entries when catalogs is undefined", () => {
      const adapter = openaiToolSearchAdapter();
      const result = adapter.format({
        tools: { core: stubTool() },
        deferredTools: undefined,
      });

      const catalogKeys = Object.keys(result.tools).filter((k) =>
        k.startsWith("tool_search__"),
      );
      expect(catalogKeys).toHaveLength(0);
    });
  });
});
