import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ streamText: vi.fn() }));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  streamText: mocks.streamText,
}));

import { POST } from "./route";

const request = (body: string) =>
  new Request("http://localhost/blocks/demos/document-editor/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /blocks/demos/document-editor/api/chat", () => {
  it("answers 404 unless BLOCKS_LIVE_API is true", async () => {
    vi.stubEnv("BLOCKS_LIVE_API", "1");

    const response = await POST(request(JSON.stringify({ messages: [] })));

    expect(response.status).toBe(404);
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it.each([
    ["a body that is not JSON", "{"],
    ["a body without messages", JSON.stringify({ system: "hi" })],
    [
      "a system prompt over 4000 characters",
      JSON.stringify({ messages: [], system: "x".repeat(4001) }),
    ],
  ])("answers 400 for %s", async (_, body) => {
    vi.stubEnv("BLOCKS_LIVE_API", "true");

    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(mocks.streamText).not.toHaveBeenCalled();
  });
});
