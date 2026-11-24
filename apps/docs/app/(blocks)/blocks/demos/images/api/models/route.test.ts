import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  cacheLife: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

const { GET } = await import("./route");

const listed = (
  id: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  name: id.toUpperCase(),
  provider: "openai",
  ...extra,
});

const fetchMock = vi.fn<typeof fetch>();

function modelpedia(pages: Record<string, unknown>[][]) {
  const total = pages.flat().length;
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/providers")) {
      return Response.json({ data: [{ id: "openai", name: "OpenAI" }] });
    }
    const offset = Number(url.searchParams.get("offset"));
    return Response.json({
      data: pages[offset / 500] ?? [],
      meta: { total },
    });
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /blocks/demos/images/api/models", () => {
  it("keeps the models that make images, across every page", async () => {
    const first = [
      listed("gpt-image-2", { model_type: "image" }),
      listed("gpt-5", {
        model_type: "chat",
        modalities: { output: ["text"] },
      }),
      listed("gpt-5-image", {
        model_type: "chat",
        modalities: { output: ["text", "image"] },
      }),
      listed("sora-video", { model_type: "image" }),
      listed("dall-e-2", { model_type: "image", status: "deprecated" }),
      ...Array.from({ length: 495 }, (_, index) =>
        listed(`filler-${index}`, { model_type: "embedding" }),
      ),
    ];
    const second = [
      listed("veo", {
        model_type: "image",
        modalities: { output: ["image", "video"] },
      }),
      listed("imagen", { provider: "google", model_type: "image" }),
    ];
    modelpedia([first, second]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      models: [
        { id: "openai/gpt-image-2", name: "GPT-IMAGE-2", provider: "OpenAI" },
        { id: "openai/gpt-5-image", name: "GPT-5-IMAGE", provider: "OpenAI" },
        { id: "google/imagen", name: "IMAGEN", provider: "google" },
      ],
    });
  });

  it("answers 502 when Modelpedia fails", async () => {
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));

    const response = await GET();

    expect(response.status).toBe(502);
  });
});
