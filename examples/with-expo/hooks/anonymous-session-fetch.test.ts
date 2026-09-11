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

  it("retries bootstrap on the next request after issuance fails", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(Response.json({ token: "signed-session" }))
      .mockResolvedValueOnce(new Response("ok"));
    const sessionFetch = createAnonymousSessionFetch(
      "https://www.assistant-ui.com/api/chat",
      fetchMock,
    );

    const failedResponse = await sessionFetch(
      "https://www.assistant-ui.com/api/chat",
      { method: "POST" },
    );
    const recoveredResponse = await sessionFetch(
      "https://www.assistant-ui.com/api/chat",
      { method: "POST" },
    );

    expect(failedResponse.status).toBe(403);
    expect(recoveredResponse.status).toBe(200);
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

  it("accepts a same-origin 204 cookie bootstrap", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response("ok"));
    const sessionFetch = createAnonymousSessionFetch(
      "https://example.com/api/chat",
      fetchMock,
    );

    const response = await sessionFetch("https://example.com/api/chat", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe("same-origin");
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get(
        "x-assistant-ui-anonymous-session",
      ),
    ).toBeNull();
  });
});
