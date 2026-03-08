import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantCloudAPI } from "../AssistantCloudAPI";

describe("AssistantCloudAPI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes query params, merges auth headers, and sends JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ data: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    await api.makeRawRequest("/threads", {
      method: "POST",
      query: { archived: false, detailed: true, page: 2 },
      headers: { "X-Test": "1" },
      body: { hello: "world" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;

    // false values are excluded from query params; others are serialized
    expect(url.toString()).toBe(
      "https://backend.assistant-api.com/v1/threads?detailed=true&page=2",
    );

    // Real API-key auth headers are merged with custom headers
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Aui-User-Id": "u-1",
      "Aui-Workspace-Id": "w-1",
      "Content-Type": "application/json",
      "X-Test": "1",
    });

    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ hello: "world" }));
  });

  it("rejects before fetch when auth token callback returns null", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      baseUrl: "https://test.example.com",
      authToken: async () => null,
    });

    await expect(api.makeRawRequest("/threads")).rejects.toThrow(
      "Authorization failed",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws APIError with parsed message for JSON error responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ message: "invalid request payload" }),
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    const error = await api.makeRawRequest("/threads").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("APIError");
    expect(error.message).toBe("invalid request payload");
  });

  it("throws generic error with status for non-JSON error responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue("Bad Gateway"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    await expect(api.makeRawRequest("/threads")).rejects.toThrow(
      "Request failed with status 502, Bad Gateway",
    );
  });

  it("makeRequest returns parsed JSON from a successful response", async () => {
    const responseData = { threads: [{ id: "t-1" }] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue(responseData),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    const result = await api.makeRequest("/threads");
    expect(result).toEqual(responseData);
  });
});
