import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantCloudAPI, CloudAPIError } from "../AssistantCloudAPI";

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

  it("uses custom baseUrl when provided with apiKey config", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      baseUrl: "https://custom.example.com",
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    await api.makeRawRequest("/threads");

    const [url] = fetchMock.mock.calls[0]!;
    expect(url.toString()).toBe("https://custom.example.com/v1/threads");
  });

  it("strips a trailing slash from a custom baseUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      baseUrl: "https://custom.example.com/",
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    await api.makeRawRequest("/threads");

    const [url] = fetchMock.mock.calls[0]!;
    expect(url.toString()).toBe("https://custom.example.com/v1/threads");
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

  it("returns false from initializeAuth when auth token callback returns null", async () => {
    const api = new AssistantCloudAPI({
      baseUrl: "https://test.example.com",
      authToken: async () => null,
    });

    await expect(api.initializeAuth()).resolves.toBe(false);
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
    expect(error).toBeInstanceOf(CloudAPIError);
    expect(error.name).toBe("CloudAPIError");
    expect(error.message).toBe("invalid request payload");
    expect(error.status).toBe(400);
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

    const error = await api.makeRawRequest("/threads").catch((e) => e);
    expect(error).toBeInstanceOf(CloudAPIError);
    expect(error.message).toBe("Request failed with status 502, Bad Gateway");
    expect(error.status).toBe(502);
  });

  it("makeRequest returns parsed JSON from a successful response", async () => {
    const responseData = { threads: [{ id: "t-1" }] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(JSON.stringify(responseData)),
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

  it("makeRequest returns undefined from a successful empty response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(""),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    await expect(
      api.makeRequest("/threads/t-1", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("makeRequest returns undefined when content-length is zero", async () => {
    const text = vi.fn().mockResolvedValue("");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "0" }),
      text,
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    await expect(api.makeRequest("/threads/t-1")).resolves.toBeUndefined();
    expect(text).not.toHaveBeenCalled();
  });

  it("makeRequest returns undefined from a whitespace-only success body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue("  "),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new AssistantCloudAPI({
      apiKey: "test-key",
      userId: "u-1",
      workspaceId: "w-1",
    });

    await expect(api.makeRequest("/threads/t-1")).resolves.toBeUndefined();
  });
});
