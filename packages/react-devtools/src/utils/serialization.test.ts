import { describe, expect, it } from "vitest";
import {
  REDACTED,
  redactSensitive,
  serializeModelContext,
} from "./serialization";

describe("redactSensitive", () => {
  it("masks credential-named keys but leaves lookalikes alone", () => {
    const out = redactSensitive({
      apiKey: "sk-123",
      authorization: "Bearer abc",
      maxTokens: 100,
      tokenCount: 42,
      nested: { client_secret: "shh", model: "gpt" },
    }) as Record<string, unknown>;

    expect(out.apiKey).toBe(REDACTED);
    expect(out.authorization).toBe(REDACTED);
    expect(out.maxTokens).toBe(100);
    expect(out.tokenCount).toBe(42);
    expect(out.nested).toEqual({ client_secret: REDACTED, model: "gpt" });
  });

  it("recurses through arrays", () => {
    const out = redactSensitive([{ token: "a" }, { ok: 1 }]) as unknown[];
    expect(out).toEqual([{ token: REDACTED }, { ok: 1 }]);
  });
});

describe("serializeModelContext", () => {
  it("redacts secrets in config and call settings, keeps the rest", () => {
    const result = serializeModelContext({
      config: { apiKey: "sk-123", baseUrl: "https://api.example.com" },
      callSettings: {
        maxTokens: 256,
        headers: { Authorization: "Bearer xyz" },
      },
    } as never);

    expect(result?.config).toEqual({
      apiKey: REDACTED,
      baseUrl: "https://api.example.com",
    });
    expect(result?.callSettings).toEqual({
      maxTokens: 256,
      headers: { Authorization: REDACTED },
    });
  });

  it("redacts tool providerOptions/server but never the parameters schema", () => {
    const result = serializeModelContext({
      tools: {
        search: {
          type: "frontend",
          parameters: {
            type: "object",
            properties: { token: { type: "string" } },
          },
          providerOptions: { openai: { apiKey: "sk-xyz" } },
        },
        mcp_tool: {
          type: "mcp",
          server: { type: "http", url: "https://x", headers: { token: "t" } },
        },
      },
    } as never);

    const search = result?.tools?.find((t) => t.name === "search");
    const mcpTool = result?.tools?.find((t) => t.name === "mcp_tool");

    expect(search?.providerOptions).toEqual({ openai: { apiKey: REDACTED } });
    expect(search?.parameters).toEqual({
      type: "object",
      properties: { token: { type: "string" } },
    });
    expect(mcpTool?.server).toEqual({
      type: "http",
      url: "https://x",
      headers: { token: REDACTED },
    });
  });

  it("returns undefined when there is no context", () => {
    expect(serializeModelContext(undefined)).toBeUndefined();
  });
});
