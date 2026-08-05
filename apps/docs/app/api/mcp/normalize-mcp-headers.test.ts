import { describe, expect, it } from "vitest";
import { normalizeMcpRequestHeaders } from "./normalize-mcp-headers";

const encoder = new TextEncoder();

const makeRequest = (headers: Record<string, string>, body = "{}") =>
  new Request("https://example.com/api/mcp", {
    method: "POST",
    headers,
    body: encoder.encode(body),
  });

describe("normalizeMcpRequestHeaders", () => {
  it("rewrites Accept when only application/json is present", async () => {
    const request = makeRequest({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    const result = await normalizeMcpRequestHeaders(request);
    expect(result.headers.get("accept")).toBe(
      "application/json, text/event-stream",
    );
  });

  it("rewrites Accept when only text/event-stream is present", async () => {
    const request = makeRequest({
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    });
    const result = await normalizeMcpRequestHeaders(request);
    expect(result.headers.get("accept")).toBe(
      "application/json, text/event-stream",
    );
  });

  it("rewrites Accept when the header is absent", async () => {
    const request = makeRequest({ "Content-Type": "application/json" });
    const result = await normalizeMcpRequestHeaders(request);
    expect(result.headers.get("accept")).toBe(
      "application/json, text/event-stream",
    );
  });

  it("rewrites Accept when it is a bare wildcard", async () => {
    const request = makeRequest({
      Accept: "*/*",
      "Content-Type": "application/json",
    });
    const result = await normalizeMcpRequestHeaders(request);
    expect(result.headers.get("accept")).toBe(
      "application/json, text/event-stream",
    );
  });

  it("returns the original request unchanged when Accept already contains both", async () => {
    const request = makeRequest({
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    });
    const result = await normalizeMcpRequestHeaders(request);
    expect(result).toBe(request);
  });

  it("defaults Content-Type to application/json when absent and preserves the body", async () => {
    const payload = '{"jsonrpc":"2.0","id":1,"method":"ping"}';
    const request = makeRequest(
      { Accept: "application/json, text/event-stream" },
      payload,
    );
    const result = await normalizeMcpRequestHeaders(request);
    expect(result.headers.get("content-type")).toBe("application/json");
    await expect(result.text()).resolves.toBe(payload);
  });

  it("leaves a present but incorrect Content-Type unchanged while still fixing Accept", async () => {
    const request = makeRequest({
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const result = await normalizeMcpRequestHeaders(request);
    expect(result).not.toBe(request);
    expect(result.headers.get("accept")).toBe(
      "application/json, text/event-stream",
    );
    expect(result.headers.get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
  });

  it("preserves the body when rewriting Accept", async () => {
    const payload = '{"jsonrpc":"2.0","id":2,"method":"tools/list"}';
    const request = makeRequest({ Accept: "application/json" }, payload);
    const result = await normalizeMcpRequestHeaders(request);
    await expect(result.text()).resolves.toBe(payload);
  });
});
