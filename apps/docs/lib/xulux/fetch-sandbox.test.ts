import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSandboxResource } from "./fetch-sandbox";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn<typeof fetch>(),
}));

describe("fetchSandboxResource", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("adds sandbox headers and disables caching", async () => {
    const response = new Response("ok");
    mocks.fetch.mockResolvedValueOnce(response);

    await expect(
      fetchSandboxResource("https://sandbox.example.com/preview"),
    ).resolves.toBe(response);

    const init = mocks.fetch.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(init?.cache).toBe("no-store");
    expect(headers.get("accept")).toBe(
      "application/json, application/zip, application/octet-stream, */*",
    );
    expect(headers.get("user-agent")).toBe("curl/8.7.1");
  });

  it("preserves request options and lets callers override headers", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await fetchSandboxResource("https://sandbox.example.com/session", {
      method: "POST",
      cache: "force-cache",
      headers: {
        Accept: "application/json",
        "X-Template-Id": "base-assistant-ui",
      },
      body: "{}",
    });

    const init = mocks.fetch.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe("{}");
    expect(init?.cache).toBe("no-store");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("x-template-id")).toBe("base-assistant-ui");
    expect(headers.get("user-agent")).toBe("curl/8.7.1");
  });

  it("retries transient fetch failures with increasing delays", async () => {
    vi.useFakeTimers();
    mocks.fetch
      .mockRejectedValueOnce(
        Object.assign(new Error("request failed"), {
          cause: { code: "ECONNRESET" },
        }),
      )
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(new Response("ok"));

    const pending = fetchSandboxResource("https://sandbox.example.com/preview");

    await vi.advanceTimersByTimeAsync(299);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(599);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    await expect(pending).resolves.toBeInstanceOf(Response);
  });

  it("does not retry non-transient errors", async () => {
    const error = new Error("invalid URL");
    mocks.fetch.mockRejectedValueOnce(error);

    await expect(
      fetchSandboxResource("https://sandbox.example.com/preview"),
    ).rejects.toBe(error);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws the last transient error after three attempts", async () => {
    vi.useFakeTimers();
    const error = Object.assign(new Error("request failed"), {
      cause: { code: "ETIMEDOUT" },
    });
    mocks.fetch.mockRejectedValue(error);

    const rejection = expect(
      fetchSandboxResource("https://sandbox.example.com/preview"),
    ).rejects.toBe(error);
    await vi.advanceTimersByTimeAsync(900);

    await rejection;
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
});
