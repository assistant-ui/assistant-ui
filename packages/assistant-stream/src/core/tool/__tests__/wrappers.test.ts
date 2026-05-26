import { describe, it, expect } from "vitest";
import { injectDiscoveryWrappers } from "../wrappers";
import type { Tool } from "../tool-types";

const stubTool = (): Tool<any, any> =>
  ({
    description: "stub",
    parameters: { type: "object", properties: {} },
  }) as unknown as Tool<any, any>;

const withDeferred = (tools?: Record<string, Tool<any, any>>) =>
  injectDiscoveryWrappers({
    tools,
    deferredTools: { someDeferred: stubTool() },
  });

describe("injectDiscoveryWrappers", () => {
  describe("wrappers are injected only when deferred tools exist", () => {
    it("injects both wrapper tools when deferred tools are present", () => {
      const result = withDeferred();
      expect(result).toHaveProperty("aui_discover_tools");
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });

    it("omits wrappers entirely when there are no deferred tools", () => {
      const result = injectDiscoveryWrappers({
        tools: { myCoreTool: stubTool() },
        deferredTools: undefined,
      });
      expect(result).toEqual({
        myCoreTool: expect.anything(),
      });
      expect(result).not.toHaveProperty("aui_discover_tools");
      expect(result).not.toHaveProperty("aui_run_dynamic_tool");
    });

    it("omits wrappers when deferredTools is an empty object", () => {
      const result = injectDiscoveryWrappers({
        tools: undefined,
        deferredTools: {},
      });
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("eager tool passthrough", () => {
    it("includes eager tools alongside wrappers", () => {
      const result = withDeferred({ myCoreTool: stubTool() });
      expect(result).toHaveProperty("myCoreTool");
      expect(result).toHaveProperty("aui_discover_tools");
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });

    it("includes multiple eager tools", () => {
      const result = withDeferred({ toolA: stubTool(), toolB: stubTool() });
      expect(result).toHaveProperty("toolA");
      expect(result).toHaveProperty("toolB");
    });
  });

  describe("deferred tools are excluded", () => {
    it("does not include deferred tools in the output", () => {
      const result = injectDiscoveryWrappers({
        tools: { core: stubTool() },
        deferredTools: { deferred1: stubTool(), deferred2: stubTool() },
      });
      expect(result).not.toHaveProperty("deferred1");
      expect(result).not.toHaveProperty("deferred2");
    });

    it("works with only deferred tools (no core tools)", () => {
      const result = injectDiscoveryWrappers({
        tools: undefined,
        deferredTools: { someDeferred: stubTool() },
      });
      expect(result).not.toHaveProperty("someDeferred");
      expect(result).toHaveProperty("aui_discover_tools");
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });
  });

  describe("reserved name collisions", () => {
    it("throws when an eager tool uses a reserved wrapper name", () => {
      expect(() =>
        injectDiscoveryWrappers({
          tools: { aui_discover_tools: stubTool() },
          deferredTools: { d: stubTool() },
        }),
      ).toThrow(/reserved/i);
    });
  });

  describe("aui_discover_tools schema", () => {
    it("has a description mentioning tool search and requires 'query'", () => {
      const discover = withDeferred()["aui_discover_tools"] as {
        description: string;
        parameters: { required: string[]; properties: Record<string, unknown> };
      };
      expect(discover.description.toLowerCase()).toContain("search");
      expect(discover.parameters.required).toContain("query");
      expect(discover.parameters.properties).toHaveProperty("max");
    });
  });

  describe("aui_run_dynamic_tool schema", () => {
    it("mentions execution and requires 'toolName' and 'args'", () => {
      const run = withDeferred()["aui_run_dynamic_tool"] as {
        description: string;
        parameters: { required: string[] };
      };
      expect(run.description.toLowerCase()).toContain("execut");
      expect(run.parameters.required).toContain("toolName");
      expect(run.parameters.required).toContain("args");
    });
  });

  describe("tool name sorting", () => {
    it("eager tool names are sorted (stable for prompt caching)", () => {
      const result = withDeferred({
        zebra: stubTool(),
        apple: stubTool(),
        mango: stubTool(),
      });
      const keys = Object.keys(result);
      expect(keys.indexOf("apple")).toBeLessThan(keys.indexOf("mango"));
      expect(keys.indexOf("mango")).toBeLessThan(keys.indexOf("zebra"));
    });
  });
});
