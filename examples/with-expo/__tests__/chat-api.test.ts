import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/chat+api";

function chatRequest(headers: Record<string, string>) {
  return new Request("https://app.example/api/chat", {
    method: "POST",
    headers,
    body: "not json",
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chat route", () => {
  it.each<{ label: string; headers: Record<string, string> }>([
    {
      label: "a same-site browser request",
      headers: { "sec-fetch-site": "same-site" },
    },
    {
      label: "a cross-site browser request",
      headers: { "sec-fetch-site": "cross-site" },
    },
    { label: "a foreign Origin", headers: { origin: "https://evil.example" } },
    { label: "an unparsable Origin", headers: { origin: "not a url" } },
  ])("refuses $label before calling the model", async ({ headers }) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(chatRequest(headers));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
