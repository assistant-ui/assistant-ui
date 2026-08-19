import { describe, expect, it, vi } from "vitest";
import {
  createAnonymousSessionFetch,
  shouldUseAnonymousSessionFetch,
} from "./anonymous-session-fetch";

describe("Expo anonymous session fetch", () => {
  it("only bootstraps the protected browser flow on web", () => {
    expect(
      shouldUseAnonymousSessionFetch(
        "https://www.assistant-ui.com/api/chat",
        "web",
      ),
    ).toBe(true);
    expect(
      shouldUseAnonymousSessionFetch(
        "https://www.assistant-ui.com/api/chat",
        "ios",
      ),
    ).toBe(false);
    expect(shouldUseAnonymousSessionFetch("/api/chat", "web")).toBe(false);
  });

  it("falls back to a plain request and retries bootstrap after a 401", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ token: "signed-session" }))
      .mockResolvedValueOnce(new Response("ok"));
    const sessionFetch = createAnonymousSessionFetch(
      "https://www.assistant-ui.com/api/chat",
      fetchMock,
    );

    const response = await sessionFetch(
      "https://www.assistant-ui.com/api/chat",
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get(
        "x-assistant-ui-anonymous-session",
      ),
    ).toBeNull();
    expect(
      new Headers(fetchMock.mock.calls[3]?.[1]?.headers).get(
        "x-assistant-ui-anonymous-session",
      ),
    ).toBe("signed-session");
  });
});
