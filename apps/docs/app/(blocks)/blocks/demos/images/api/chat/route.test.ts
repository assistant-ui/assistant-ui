import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const PICTURE = "data:image/webp;base64,UElD";
const OVERLAY = "data:image/png;base64,T1ZS";

type Part = Record<string, unknown>;
type Message = { role: string; parts: Part[] };

const text = (value: string): Part => ({ type: "text", text: value });
const file = (url: string, mediaType = "image/webp"): Part => ({
  type: "file",
  url,
  mediaType,
});

const request = (body: unknown) =>
  new Request("http://localhost/blocks/demos/images/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const ask = (messages: Message[], custom?: Record<string, unknown>) =>
  POST(request({ messages, ...(custom && { metadata: { custom } }) }));

const answer = (pictures: string[], status = 200) =>
  new Response(
    JSON.stringify({
      data: pictures.map((b64_json) => ({ b64_json })),
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
    }),
    { status, headers: { "content-type": "application/json" } },
  );

const fetchMock = vi.fn<typeof fetch>();

/** The JSON body and path of the one call the route made to OpenAI. */
function sent() {
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0]!;
  return {
    path: new URL(String(url)).pathname,
    body: JSON.parse(String(init?.body)) as Record<string, unknown>,
  };
}

/** The chunks of a UI message stream response. */
async function chunks(response: Response) {
  const body = await response.text();
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: {"))
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BLOCKS_LIVE_API", "true");
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /blocks/demos/images/api/chat", () => {
  it("answers 404 unless BLOCKS_LIVE_API is true", async () => {
    vi.stubEnv("BLOCKS_LIVE_API", "1");

    const response = await ask([{ role: "user", parts: [text("a fox")] }]);

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 401 without a key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await ask([{ role: "user", parts: [text("a fox")] }]);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a body that is not JSON", "{"],
    ["a body without messages", { messages: [] }],
    [
      "a request with no words",
      { messages: [{ role: "user", parts: [file(PICTURE)] }] },
    ],
    [
      "a model from another provider",
      {
        messages: [{ role: "user", parts: [text("a fox")] }],
        metadata: { custom: { model: "google/imagen-4" } },
      },
    ],
    [
      "a change from the editor without a picture",
      {
        messages: [{ role: "user", parts: [text("brighter")] }],
        metadata: { custom: { edit: "plain" } },
      },
    ],
  ])("answers 400 for %s", async (_, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("makes a picture from the settings and streams it back as a file", async () => {
    fetchMock.mockResolvedValue(answer(["QUJD", "REVG"]));

    const response = await ask(
      [{ role: "user", parts: [text("a fox in snow")] }],
      {
        model: "openai/gpt-image-2",
        orientation: "16:9",
        size: "large",
        quality: "high",
        complexity: "low",
        count: 2,
        format: "jpeg",
        background: "transparent",
      },
    );
    const streamed = await chunks(response);

    const { path, body } = sent();
    expect(path).toBe("/v1/images/generations");
    expect(body).toMatchObject({
      model: "gpt-image-2",
      prompt: "a fox in snow",
      n: 2,
      size: "2560x1440",
      quality: "high",
      complexity: "low",
      output_format: "jpeg",
      background: "auto",
    });
    expect(body).not.toHaveProperty("images");
    expect(body).not.toHaveProperty("stream");
    expect(streamed.filter((chunk) => chunk["type"] === "file")).toEqual([
      {
        type: "file",
        url: "data:image/jpeg;base64,QUJD",
        mediaType: "image/jpeg",
      },
      {
        type: "file",
        url: "data:image/jpeg;base64,REVG",
        mediaType: "image/jpeg",
      },
    ]);
    expect(streamed).toContainEqual({
      type: "message-metadata",
      messageMetadata: {
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      },
    });
  });

  it("falls back to the default settings for unknown values", async () => {
    fetchMock.mockResolvedValue(answer(["QUJD"]));

    await chunks(
      await ask([{ role: "user", parts: [text("a fox")] }], {
        orientation: "5:4",
        count: 9,
        format: "gif",
      }),
    );

    expect(sent().body).toMatchObject({
      size: "auto",
      n: 1,
      output_format: "webp",
    });
  });

  it("changes the newest picture in the chat on a follow-up", async () => {
    fetchMock.mockResolvedValue(answer(["QUJD"]));
    const older = "data:image/webp;base64,T0xE";

    await chunks(
      await ask([
        { role: "user", parts: [text("a fox")] },
        { role: "assistant", parts: [file(older), file(PICTURE)] },
        { role: "user", parts: [text("make it night"), file(OVERLAY)] },
      ]),
    );

    const { path, body } = sent();
    expect(path).toBe("/v1/images/edits");
    expect(body["prompt"]).toBe("make it night");
    expect(body["images"]).toEqual([
      { image_url: PICTURE },
      { image_url: OVERLAY },
    ]);
  });

  it.each(["mask", "markup"] as const)(
    "sends an editor %s with the picture it was drawn on",
    async (edit) => {
      fetchMock.mockResolvedValue(answer(["QUJD"]));

      await chunks(
        await ask(
          [
            { role: "assistant", parts: [file("data:image/webp;base64,T0xE")] },
            {
              role: "user",
              parts: [
                text("remove the hat"),
                file(PICTURE),
                file(OVERLAY, "image/png"),
              ],
            },
          ],
          { edit, count: 3 },
        ),
      );

      const { path, body } = sent();
      expect(path).toBe("/v1/images/edits");
      expect(body["n"]).toBe(1);
      expect(body["images"]).toEqual([{ image_url: PICTURE }]);
      expect(body[edit]).toEqual({ image_url: OVERLAY });
    },
  );

  it("finishes with a content filter when the model blocks the request", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "Blocked", code: "moderation_blocked" },
        }),
        { status: 400 },
      ),
    );

    const streamed = await chunks(
      await ask([{ role: "user", parts: [text("something blocked")] }]),
    );

    expect(streamed).toContainEqual({
      type: "finish",
      finishReason: "content-filter",
    });
    expect(streamed.some((chunk) => chunk["type"] === "file")).toBe(false);
  });

  it("streams the model's error message when it fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Quota exceeded" } }), {
        status: 429,
      }),
    );

    const streamed = await chunks(
      await ask([{ role: "user", parts: [text("a fox")] }]),
    );

    expect(streamed).toContainEqual({
      type: "error",
      errorText: "Quota exceeded",
    });
  });

  it("replaces one partial picture with the next until the finished one lands", async () => {
    const events = [
      { type: "image_generation.partial_image", b64_json: "UDE=" },
      { type: "image_generation.partial_image", b64_json: "UDI=" },
      {
        type: "image_generation.completed",
        b64_json: "RE9ORQ==",
        usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
      },
    ];
    fetchMock.mockResolvedValue(
      new Response(
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        { headers: { "content-type": "text/event-stream" } },
      ),
    );

    const streamed = await chunks(
      await ask([{ role: "user", parts: [text("a fox")] }], { partials: 2 }),
    );

    expect(sent().body).toMatchObject({ stream: true, partial_images: 2 });
    expect(
      streamed.filter((chunk) =>
        ["data-partial", "file"].includes(String(chunk["type"])),
      ),
    ).toEqual([
      {
        type: "data-partial",
        id: "partial",
        data: { url: "data:image/webp;base64,UDE=" },
      },
      {
        type: "data-partial",
        id: "partial",
        data: { url: "data:image/webp;base64,UDI=" },
      },
      {
        type: "file",
        url: "data:image/webp;base64,RE9ORQ==",
        mediaType: "image/webp",
      },
    ]);
  });

  it("asks for no partial pictures when making several", async () => {
    fetchMock.mockResolvedValue(answer(["QUJD", "REVG"]));

    await chunks(
      await ask([{ role: "user", parts: [text("a fox")] }], {
        partials: 2,
        count: 2,
      }),
    );

    expect(sent().body).not.toHaveProperty("stream");
    expect(sent().body).not.toHaveProperty("partial_images");
  });
});
