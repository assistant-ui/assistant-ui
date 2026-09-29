import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { XuluxMcpCatalog } from "./mcp-catalog";
import {
  createTemplatePreview,
  getTemplateDetails,
  listTemplates,
} from "./template-service";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn<typeof fetch>(),
}));

const catalog: XuluxMcpCatalog = {
  version: 1,
  generatedAt: "2026-08-28T00:00:00.000Z",
  docsOrigin: "https://docs.example.test",
  templates: [
    {
      id: "weather-assistant",
      templateId: "weather-assistant",
      versionId: "v1",
      kind: "template",
      name: "Weather Assistant",
      summary: "A configurable weather assistant.",
      assistantPlacement: "Sidebar",
      features: ["Weather tools"],
      customizable: ["hostUi", "assistant"],
      versions: [
        {
          id: "v1",
          entryId: "weather-assistant-v1",
          name: "Weather Assistant v1",
          description: "The first weather assistant version.",
          previewUrl: "https://sandbox.example.test/previews/weather-v1",
          downloadUrl: "https://sandbox.example.test/downloads/weather-v1",
        },
      ],
      sandboxBaseUrl: "https://sandbox.example.test/templates/weather",
      configRoots: {
        hostUi: { type: "object" },
        assistant: { type: "object" },
      },
      rules: { required: ["Configure hostUi before previewing."] },
      tools: {
        builtIn: [
          {
            id: "getWeather",
            description: "Gets weather details.",
            renderer: "weather-card",
            input: { city: { type: "string" } },
            outputShape: { forecast: "string" },
          },
        ],
        customToolSupported: true,
        renderers: [
          {
            type: "weather-card",
            description: "Renders a weather forecast.",
            requiredOutputShape: { forecast: "string" },
          },
        ],
      },
    },
    {
      id: "fixed-demo",
      templateId: "fixed-demo",
      versionId: null,
      kind: "example",
      name: "Fixed Demo",
      summary: "A fixed hosted demo.",
      assistantPlacement: "Page",
      features: ["Fixed flow"],
      customizable: [],
      versions: [],
      previewUrl: "https://docs.example.test/demos/fixed",
      downloadUrl: "https://docs.example.test/downloads/fixed.zip",
    },
  ],
};

describe("template-service", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the template MCP contract shape", () => {
    expect(listTemplates(catalog)).toEqual({
      templates: [
        {
          id: "weather-assistant",
          name: "Weather Assistant",
          summary: "A configurable weather assistant.",
          assistantPlacement: "Sidebar",
          features: ["Weather tools"],
          customizable: ["hostUi", "assistant"],
          versions: [
            {
              id: "v1",
              name: "Weather Assistant v1",
              description: "The first weather assistant version.",
            },
          ],
          kind: "template",
        },
        {
          id: "fixed-demo",
          name: "Fixed Demo",
          summary: "A fixed hosted demo.",
          assistantPlacement: "Page",
          features: ["Fixed flow"],
          customizable: [],
          versions: [],
          kind: "example",
        },
      ],
    });
  });

  it("returns the authoring contract for a configurable template", async () => {
    mocks.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ exampleCompleteConfig: { hostUi: {} } })),
    );

    await expect(
      getTemplateDetails(catalog, { templateId: "weather-assistant" }),
    ).resolves.toEqual({
      id: "weather-assistant",
      name: "Weather Assistant",
      selectedVersionId: "v1",
      summary: "A configurable weather assistant.",
      assistantPlacement: "Sidebar",
      configRoots: {
        hostUi: { type: "object" },
        assistant: { type: "object" },
      },
      rules: { required: ["Configure hostUi before previewing."] },
      tools: catalog.templates[0]!.tools,
      exampleConfig: { hostUi: {} },
      exampleConfigNote:
        'Resolved defaults for version "v1". Use as a complete working starting point.',
      previewUrl: "https://sandbox.example.test/previews/weather-v1",
      downloadUrl: "https://sandbox.example.test/downloads/weather-v1",
    });
  });

  it("returns fixed demos without configRoots", async () => {
    const result = await getTemplateDetails(catalog, {
      templateId: "fixed-demo",
    });

    expect(result).toEqual({
      id: "fixed-demo",
      name: "Fixed Demo",
      selectedVersionId: null,
      summary: "A fixed hosted demo.",
      assistantPlacement: "Page",
      rules: {
        required: [
          "This entry is a fixed demo and is not schema-customizable.",
          "Preview and download it as-is. Do not pass a config for this entry.",
        ],
      },
      tools: { builtIn: [], customToolSupported: false, renderers: [] },
      exampleConfig: null,
      previewUrl: "https://docs.example.test/demos/fixed",
      downloadUrl: "https://docs.example.test/downloads/fixed.zip",
    });
    expect(result).not.toHaveProperty("configRoots");
  });

  it("creates a configured preview session through the sandbox", async () => {
    mocks.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          previewUrl: "/sessions/weather",
          downloadUrl: "/downloads/weather?format=zip",
          validationWarnings: ["The logo uses a fallback color."],
        }),
      ),
    );

    await expect(
      createTemplatePreview(catalog, {
        templateId: "weather-assistant",
        config: { hostUi: { title: "Forecast" } },
      }),
    ).resolves.toEqual({
      success: true,
      templateId: "weather-assistant",
      versionId: "v1",
      previewUrl:
        "https://sandbox.example.test/templates/weather/sessions/weather?v=v1",
      downloadUrl:
        "https://sandbox.example.test/templates/weather/downloads/weather?format=zip&v=v1",
      title: "Weather Assistant v1",
      customized: true,
      summary:
        "Created a configured preview session for Weather Assistant. URLs point at the hosted sandbox; nothing was opened in any UI.",
      validationWarnings: ["The logo uses a fallback color."],
    });

    const [url, init] = mocks.fetch.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://sandbox.example.test/api/preview/session?v=v1");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ hostUi: { title: "Forecast" } }),
      cache: "no-store",
    });
    expect(headers.get("content-type")).toBe("application/json");
  });
});
