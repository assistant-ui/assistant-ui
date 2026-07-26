import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCatalogCache } from "../../xulux/catalog-client.js";
import {
  xuluxTemplatesListTool,
  xuluxTemplateDetailsTool,
  xuluxTemplatePreviewTool,
} from "../xulux-templates.js";

const LIVE_CATALOG = {
  version: 1,
  generatedAt: "2026-07-10T00:00:00.000Z",
  docsOrigin: "https://www.assistant-ui.com",
  templates: [
    {
      id: "base-assistant-ui",
      templateId: "base-assistant-ui",
      versionId: "default",
      kind: "template",
      name: "Configurable Base Assistant UI",
      summary: "Base chat template",
      assistantPlacement: "full-page chat shell",
      features: ["threads", "composer"],
      customizable: ["assistant", "brandTheme"],
      versions: [
        {
          id: "default",
          entryId: "base-assistant-ui-default",
          name: "Default",
          description: "Default base chat",
          previewUrl: "https://base.example.com",
          downloadUrl: "https://base.example.com/api/download",
        },
      ],
      previewUrl: "https://base.example.com",
      downloadUrl: "https://base.example.com/api/download",
      sandboxBaseUrl: "https://base.example.com",
      configRoots: {
        assistant: { description: "Assistant config" },
      },
      rules: {
        required: ["Only pass documented top-level config roots."],
      },
      tools: {
        builtIn: [{ id: "getWeather" }],
        customToolSupported: true,
        renderers: [{ type: "generic" }],
      },
    },
    {
      id: "base",
      templateId: "base",
      versionId: null,
      kind: "example",
      name: "Base Demo",
      summary: "Fixed base demo",
      assistantPlacement: "full-page demo route",
      features: ["fixed demo"],
      customizable: [],
      versions: [],
      previewUrl: "https://www.assistant-ui.com/demos/base",
      downloadUrl:
        "https://www.assistant-ui.com/api/xulux/demo-download?slug=base",
      rules: {
        required: [
          "This entry is a fixed demo and is not schema-customizable.",
        ],
      },
    },
  ],
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

async function callTool(
  tool:
    | typeof xuluxTemplatesListTool
    | typeof xuluxTemplateDetailsTool
    | typeof xuluxTemplatePreviewTool,
  args: unknown,
) {
  const result = await tool.execute(args as never);
  const text = result.content?.[0]?.text;
  if (!text) throw new Error(`Tool ${tool.name} returned no text content`);
  return JSON.parse(text);
}

describe("assistant-ui template MCP tools", () => {
  beforeEach(() => {
    clearCatalogCache();
    vi.stubEnv("XULUX_CATALOG_URL", "https://catalog.example.com/mcp-catalog");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearCatalogCache();
  });

  it("lists templates from the live catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(LIVE_CATALOG)),
    );

    const result = await callTool(xuluxTemplatesListTool, {});
    expect(result.catalogDegraded).toBeUndefined();
    expect(result.templates).toHaveLength(2);
    expect(result.templates[0]).toMatchObject({
      id: "base-assistant-ui",
      kind: "template",
      name: "Configurable Base Assistant UI",
    });
  });

  it("uses the minimal fallback catalog when the live catalog is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    );

    const result = await callTool(xuluxTemplatesListTool, {});
    expect(result.catalogDegraded).toBe(true);
    expect(result.catalogDegradedReason).toContain("network unavailable");
    expect(result.templates.map((t: any) => t.id)).toContain(
      "base-assistant-ui",
    );
  });

  it("returns details and fetches exampleConfig from the selected sandbox contract", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href === "https://catalog.example.com/mcp-catalog") {
        return jsonResponse(LIVE_CATALOG);
      }
      if (href === "https://base.example.com/api/template/contract?v=default") {
        return jsonResponse({
          exampleCompleteConfig: {
            assistant: { appName: "Example" },
          },
        });
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callTool(xuluxTemplateDetailsTool, {
      templateId: "base-assistant-ui",
      versionId: "default",
    });
    expect(result.selectedVersionId).toBe("default");
    expect(result.configRoots.assistant).toBeDefined();
    expect(result.exampleConfig).toEqual({
      assistant: { appName: "Example" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://base.example.com/api/template/contract?v=default",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.any(Headers),
      }),
    );
    const sandboxCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/api/template/contract"),
    ) as [string | URL, RequestInit] | undefined;
    expect(sandboxCall?.[1].headers).toBeInstanceOf(Headers);
    expect((sandboxCall?.[1].headers as Headers).get("User-Agent")).toBe(
      "curl/8.7.1",
    );
  });

  it("returns fixed demo preview URLs and rejects config for fixed demos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(LIVE_CATALOG)),
    );

    const ok = await callTool(xuluxTemplatePreviewTool, {
      templateId: "base",
    });
    expect(ok).toMatchObject({
      success: true,
      templateId: "base",
      previewUrl: "https://www.assistant-ui.com/demos/base",
      customized: false,
    });

    const rejected = await callTool(xuluxTemplatePreviewTool, {
      templateId: "base",
      config: { assistant: { appName: "Nope" } },
    });
    expect(rejected.success).toBe(false);
    expect(rejected.error).toContain("fixed demo");
  });

  it("creates configured hosted previews through the sandbox session endpoint", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href === "https://catalog.example.com/mcp-catalog") {
        return jsonResponse(LIVE_CATALOG);
      }
      if (href === "https://base.example.com/api/preview/session?v=default") {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({ assistant: { appName: "Custom" } }),
        );
        return jsonResponse({
          previewUrl: "/preview/session-1",
          downloadUrl: "/api/download?session=1",
          validationWarnings: [],
        });
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callTool(xuluxTemplatePreviewTool, {
      templateId: "base-assistant-ui-default",
      config: { assistant: { appName: "Custom" } },
    });
    expect(result).toMatchObject({
      success: true,
      templateId: "base-assistant-ui",
      versionId: "default",
      previewUrl: "https://base.example.com/preview/session-1?v=default",
      downloadUrl: "https://base.example.com/api/download?session=1&v=default",
      customized: true,
    });
  });

  it("matches the web tool shape for configured preview network failures", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href === "https://catalog.example.com/mcp-catalog") {
        return jsonResponse(LIVE_CATALOG);
      }
      if (href === "https://base.example.com/api/preview/session?v=default") {
        throw new Error("fetch failed");
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callTool(xuluxTemplatePreviewTool, {
      templateId: "base-assistant-ui",
      config: { assistant: { appName: "Custom" } },
    });
    expect(result).toEqual({
      success: false,
      templateId: "base-assistant-ui",
      versionId: "default",
      error: "fetch failed",
    });
  });
});
