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

  it("preserves readable metadata when a tool property throws", () => {
    const tool = { type: "frontend", providerOptions: { strict: true } };
    Object.defineProperty(tool, "description", {
      get: () => {
        throw new Error("description getter failed");
      },
    });

    expect(normalizeToolList({ search: tool })).toEqual([
      {
        name: "search",
        type: "frontend",
        description: "[Unserializable]",
        providerOptions: { strict: true },
      },
    ]);
  });

  it("keeps tool names when an object entry getter throws", () => {
    const tools = {};
    Object.defineProperty(tools, "broken", {
      enumerable: true,
      get: () => {
        throw new Error("tool getter failed");
      },
    });
    Object.defineProperty(tools, "readable", {
      enumerable: true,
      value: { type: "frontend" },
    });

    expect(normalizeToolList(tools)).toEqual([
      { name: "broken" },
      { name: "readable", type: "frontend" },
    ]);
  });

  it("returns an empty list for non-objects", () => {
    expect(normalizeToolList(undefined)).toEqual([]);
    expect(normalizeToolList(null)).toEqual([]);
  });
});
