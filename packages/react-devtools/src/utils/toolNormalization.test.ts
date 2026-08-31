import { z } from "zod";
import { describe, expect, it } from "vitest";
import { normalizeToolList } from "./toolNormalization";

describe("normalizeToolList", () => {
  it("retains the full metadata of a provider tool", () => {
    const [tool] = normalizeToolList({
      web_search: {
        type: "provider",
        providerId: "openai.web_search_preview",
        args: { searchContextSize: "high" },
        supportsDeferredResults: true,
        disabled: false,
      },
    });

    expect(tool).toMatchObject({
      name: "web_search",
      type: "provider",
      providerId: "openai.web_search_preview",
      providerArgs: { searchContextSize: "high" },
      supportsDeferredResults: true,
      disabled: false,
    });
  });

  it("retains the MCP server config and display mode", () => {
    const [tool] = normalizeToolList({
      list_repos: {
        type: "mcp",
        display: "standalone",
        server: { type: "http", url: "https://mcp.example.com" },
      },
    });

    expect(tool?.type).toBe("mcp");
    expect(tool?.display).toBe("standalone");
    expect(tool?.server).toEqual({
      type: "http",
      url: "https://mcp.example.com",
    });
  });

  it("retains providerOptions and backend defaults", () => {
    const [tool] = normalizeToolList({
      submit: {
        type: "frontend",
        parameters: { type: "object" },
        providerOptions: { openai: { strict: true } },
        unstable_backendDefault: { parameters: true },
      },
    });

    expect(tool?.providerOptions).toEqual({ openai: { strict: true } });
    expect(tool?.backendDefault).toEqual({ parameters: true });
    expect(tool?.parameters).toEqual({ type: "object" });
  });

  it("handles the array form", () => {
    const tools = normalizeToolList([
      { name: "a", type: "frontend" },
      { name: "b", type: "backend", disabled: true },
    ]);
    expect(tools.map((t) => t.name)).toEqual(["a", "b"]);
    expect(tools[1]?.disabled).toBe(true);
  });

  it("preserves array entries around an unreadable slot", () => {
    const tools = [
      { name: "first", type: "frontend" },
      { name: "hidden-one", type: "frontend" },
      { name: "hidden-two", type: "frontend" },
      { name: "last", type: "backend" },
    ];
    Object.defineProperty(tools, 1, {
      get: () => {
        throw new Error("tool unavailable");
      },
    });
    Object.defineProperty(tools, 2, {
      get: () => {
        throw new Error("tool unavailable");
      },
    });

    expect(normalizeToolList(tools)).toEqual([
      { name: "first", type: "frontend" },
      { name: "[Unserializable]" },
      { name: "[Unserializable]" },
      { name: "last", type: "backend" },
    ]);
  });

  it("keeps Zod schemas that cannot be converted to JSON Schema", () => {
    const parameters = z.object({ when: z.date() });

    expect(normalizeToolList({ schedule: { parameters } })[0]?.parameters).toBe(
      parameters,
    );
  });

  it("returns an empty list for non-objects", () => {
    expect(normalizeToolList(undefined)).toEqual([]);
    expect(normalizeToolList(null)).toEqual([]);
  });

  it("preserves readable tool properties when another getter throws", () => {
    const tool = { description: "Search documents" };
    Object.defineProperty(tool, "type", {
      enumerable: true,
      get: () => {
        throw new Error("type unavailable");
      },
    });

    expect(normalizeToolList({ search: tool })).toEqual([
      {
        name: "search",
        type: "[Unserializable]",
        description: "Search documents",
      },
    ]);
  });

  it("represents a tool collection that rejects enumeration", () => {
    const tools = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("enumeration unavailable");
        },
      },
    );

    expect(normalizeToolList(tools)).toEqual([{ name: "[Unserializable]" }]);
  });
});
