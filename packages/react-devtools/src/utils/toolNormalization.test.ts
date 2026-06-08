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

  it("returns an empty list for non-objects", () => {
    expect(normalizeToolList(undefined)).toEqual([]);
    expect(normalizeToolList(null)).toEqual([]);
  });
});
